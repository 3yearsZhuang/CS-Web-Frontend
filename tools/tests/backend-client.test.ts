/**
 * @file backend-client 单元测试：cookie/JWT 托管、401 静默刷新、翻译助手
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const refreshCalls: Array<{ body: string }> = [];

const mockFetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input);
  const method = init?.method ?? 'GET';

  if (url.includes('/auth/refresh')) {
    refreshCalls.push({ body: String(init?.body ?? '') });
    if (refreshCalls.length === 1) {
      return new Response(
        JSON.stringify({ access_token: 'new-access', refresh_token: 'new-refresh' }),
        { status: 200 },
      );
    }
    return new Response(JSON.stringify({ message: 'invalid' }), { status: 401 });
  }

  if (url.includes('/auth/me')) {
    return new Response(
      JSON.stringify({
        user: {
          id: 1,
          username: 'tester',
          email: 't@test.dev',
          display_name: 'Tester',
          bio: null,
          avatar_url: null,
          avatar_type: 'initial',
          github_url: null,
          website_url: null,
          tech_tags: ['web'],
          is_active: true,
          is_superuser: false,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
        roles: ['user'],
      }),
      { status: 200 },
    );
  }

  if (url.includes('/protected')) {
    const auth = init?.headers && 'Authorization' in (init.headers as Record<string, string>)
      ? (init.headers as Record<string, string>).Authorization
      : '';
    if (auth === 'Bearer expired-access' && refreshCalls.length === 1) {
      return new Response(JSON.stringify({ message: 'expired' }), { status: 401 });
    }
    if (auth === 'Bearer new-access') {
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    return new Response(JSON.stringify({ message: 'unauthorized' }), { status: 401 });
  }

  return new Response(JSON.stringify({}), { status: 404 });
});

vi.stubGlobal('fetch', mockFetch);

vi.mock('server-only', () => ({}));

import { getCookieValue } from '@/shared/security/security';

vi.mock('@/shared/security/security', () => ({
  getCookieValue: vi.fn((req: Request, name: string) => {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    return match ? match[1] : null;
  }),
}));

import {
  proxyBackend,
  fetchMeWithPair,
  resolvePrimaryRole,
  toSafeUserFromBackend,
  toEventItem,
  toCommunityPost,
  frontendKeyToBackendName,
  backendNameToFrontendKey,
  toAdminRole,
} from '@/shared/backend-client';

function makeRequest(cookies: Record<string, string>): Request {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
  return new Request('http://localhost/api/test', {
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  });
}

beforeEach(() => {
  refreshCalls.length = 0;
});

describe('proxyBackend', () => {
  it('注入 Authorization 头并透传 200', async () => {
    const req = makeRequest({ fztbu_access: 'valid-access', fztbu_refresh: 'valid-refresh' });
    const result = await proxyBackend(req, { path: '/protected' });
    expect(result.status).toBe(200);
    expect(result.clearAuth).toBe(false);
  });

  it('401 时静默刷新并重试一次，返回新 pair', async () => {
    const req = makeRequest({ fztbu_access: 'expired-access', fztbu_refresh: 'valid-refresh' });
    const result = await proxyBackend(req, { path: '/protected' });
    expect(result.status).toBe(200);
    expect(result.authPair?.access_token).toBe('new-access');
    expect(refreshCalls).toHaveLength(1);
  });

  it('刷新失败时标记 clearAuth', async () => {
    refreshCalls.push({ body: '{}' }); // 使 refresh 第一次就失败（mock 第一个调用返回 401）
    const req = makeRequest({ fztbu_access: 'expired-access', fztbu_refresh: 'bad-refresh' });
    const result = await proxyBackend(req, { path: '/protected' });
    expect(result.status).toBe(401);
    expect(result.clearAuth).toBe(true);
  });
});

describe('fetchMeWithPair', () => {
  it('用 JWT 对换取用户信息与角色', async () => {
    const me = await fetchMeWithPair({ access_token: 'x', refresh_token: 'y' });
    expect(me?.user.email).toBe('t@test.dev');
    expect(me?.roles).toEqual(['user']);
    expect(me?.user.id).toBe('1');
  });
});

describe('角色解析', () => {
  it('root > admin > content_moderator > user', () => {
    expect(resolvePrimaryRole(['user'])).toBe('user');
    expect(resolvePrimaryRole(['content_moderator'])).toBe('content_moderator');
    expect(resolvePrimaryRole(['admin', 'exam_admin'])).toBe('admin');
    expect(resolvePrimaryRole(['root'])).toBe('root');
    expect(resolvePrimaryRole([])).toBe('user');
  });

  it('toSafeUserFromBackend 兜底 is_superuser → root', () => {
    const user = toSafeUserFromBackend({ id: 2, username: 'r', email: 'r@t.dev' }, []);
    expect(user.role).toBe('user');
    const superUser = toSafeUserFromBackend(
      { id: 3, username: 's', email: 's@t.dev', is_superuser: true },
      [],
    );
    expect(superUser.role).toBe('root');
  });
});

describe('翻译助手', () => {
  it('toEventItem snake_case → camelCase', () => {
    const item = toEventItem({
      id: 9,
      month: '2026-08',
      date: '15',
      title: '分享会',
      status: 'upcoming',
      topics: ['a'],
      is_pinned: true,
      capacity: 50,
      created_at: '2026-01-01T00:00:00Z',
    });
    expect(item.id).toBe('9');
    expect(item.isPinned).toBe(true);
    expect(item.capacity).toBe(50);
  });

  it('toCommunityPost kind/status 映射', () => {
    const post = toCommunityPost({
      id: 7,
      kind: 'post',
      author_id: 1,
      title: '文章',
      content_markdown: '# t',
      status: 'published',
      tags: ['web'],
      reply_count: 3,
    });
    expect(post.kind).toBe('post');
    expect(post.authorId).toBe('1');
    expect(post.tags).toEqual(['web']);
  });

  it('权限 key 双向映射', () => {
    expect(frontendKeyToBackendName('forum.topic.hide')).toBe('forum_topic:hide');
    expect(backendNameToFrontendKey('forum_topic:hide')).toBe('forum.topic.hide');
  });

  it('toAdminRole 过滤未知权限点', () => {
    const known = new Set(['forum.topic.hide', 'exam.create']);
    const role = toAdminRole(
      {
        name: 'moderator',
        display_name: '版主',
        permissions: ['forum_topic:hide', 'some_future:thing'],
      },
      known,
    );
    expect(role.key).toBe('moderator');
    expect(role.permissions).toEqual(['forum.topic.hide']);
  });
});
