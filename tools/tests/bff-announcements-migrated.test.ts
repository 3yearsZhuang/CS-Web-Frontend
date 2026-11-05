/**
 * @file announcements BFF 路由迁移回归（routeHandler 工厂）
 *
 * 迁移 MUST 保持对外语义：GET 返回数组、POST 做 camel→snake 白名单映射与 Origin 校验。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const ORIGINAL_ENV = { ...process.env };
beforeEach(() => {
  process.env = { ...ORIGINAL_ENV, ALLOWED_ORIGINS: 'http://localhost:2333' };
  vi.resetModules();
});
afterEach(() => {
  vi.unstubAllEnvs();
  process.env = { ...ORIGINAL_ENV };
});

describe('GET /api/announcements', () => {
  it('裸数组 → 翻译后的数组', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify([{ id: 1, title: 'T', content: 'C', level: 'info', priority: 0 }]),
          { status: 200 },
        ),
      ),
    );
    const { GET } = await import('@/app/api/announcements/route');
    const res = await GET(new Request('http://localhost/api/announcements'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].id).toBe('1');
    expect(body[0].title).toBe('T');
  });

  it('后端 500 不再被渲染成 200 空数组', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ message: 'boom' }), { status: 500 })),
    );
    const { GET } = await import('@/app/api/announcements/route');
    const res = await GET(new Request('http://localhost/api/announcements'));
    expect(res.status).toBe(500);
  });
});

describe('POST /api/announcements', () => {
  it('camelCase 请求体转成后端 snake_case 白名单', async () => {
    const captured: Array<Record<string, unknown>> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
        captured.push(body);
        return new Response(JSON.stringify({ id: 9, title: body.title }), { status: 200 });
      }),
    );
    const { POST } = await import('@/app/api/announcements/route');
    const res = await POST(
      new Request('http://localhost/api/announcements', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          origin: 'http://localhost:2333',
        },
        body: JSON.stringify({ title: '新公告', isActive: false, targetRoles: ['admin'] }),
      }),
    );
    expect(res.status).toBe(200);
    expect(captured).toHaveLength(1);
    const sent = captured[0];
    // 白名单映射：camel → snake
    expect(sent.is_active).toBe(false);
    expect(sent.target_roles).toEqual(['admin']);
    // 不透传未知键
    expect(Object.keys(sent)).not.toContain('isActive');
  });

  it('非法 Origin 被拒绝（403）', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
    const { POST } = await import('@/app/api/announcements/route');
    const res = await POST(
      new Request('http://localhost/api/announcements', {
        method: 'POST',
        headers: { 'content-type': 'application/json', origin: 'https://evil.example.com' },
        body: JSON.stringify({ title: 'x' }),
      }),
    );
    expect(res.status).toBe(403);
  });
});
