/**
 * @file 个人资料 API — GET/PUT /api/profile（BFF 薄转发 → FastAPI）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import {
  clearAuthCookies,
  normalizeError,
  proxyBackend,
  setAuthCookies,
  toSafeUserFromBackend,
  type BackendUser,
} from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/auth/profile' });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ error: '未登录', code: 'UNAUTHORIZED' }, { status: 401 });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }

  const body = proxy.body as { user?: BackendUser; roles?: string[] } | null;
  if (!body?.user) {
    const res = NextResponse.json({ error: '未登录', code: 'UNAUTHORIZED' }, { status: 401 });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }

  const user = toSafeUserFromBackend(body.user, body.roles);
  const res = NextResponse.json({ user });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function PUT(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const proxy = await proxyBackend(req, {
    path: '/auth/profile',
    method: 'PUT',
    jsonBody: {
      display_name: body.displayName,
      bio: body.bio,
      github_url: body.githubUrl,
      website_url: body.websiteUrl,
      tech_tags: Array.isArray(body.techTags) ? body.techTags : undefined,
    },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '保存失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }

  const payload = proxy.body as { user?: BackendUser; roles?: string[] };
  const res = NextResponse.json({ user: payload.user ? toSafeUserFromBackend(payload.user, payload.roles) : null });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
