/**
 * @file 2FA API — GET /api/auth/2fa（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, resolvePrimaryRole, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/auth/2fa' });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ error: '未登录', code: 'UNAUTHORIZED' }, { status: 401 });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }

  const meProxy = await proxyBackend(req, { path: '/auth/me' });
  const roles =
    meProxy.status === 200 && meProxy.body && typeof meProxy.body === 'object'
      ? ((meProxy.body as { roles?: string[] }).roles ?? [])
      : [];

  const body = proxy.body as { enabled?: boolean } | null;
  const res = NextResponse.json({
    enabled: body?.enabled ?? false,
    required: resolvePrimaryRole(roles) === 'admin',
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
