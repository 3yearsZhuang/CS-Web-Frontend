/**
 * @file 当前用户 API — GET /api/auth/me（BFF 薄转发 → FastAPI）
 */
import { NextResponse } from 'next/server';
import {
  clearAuthCookies,
  proxyBackend,
  setAuthCookies,
  toSafeUserFromBackend,
  type BackendUser,
} from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/auth/me' });

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
