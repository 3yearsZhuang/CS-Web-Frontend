/**
 * @file 2FA API — GET /api/auth/2fa（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies, toSafeUserFromBackend, type BackendUser } from '@/shared/backend-client';
import { isAdminRole } from '@/shared/types';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/auth/2fa' });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ error: '未登录', code: 'UNAUTHORIZED' }, { status: 401 });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }

  // 通过 /auth/me 取用户与角色，经 toSafeUserFromBackend 统一解析主角色
  // （superuser → root，与全站角色显示一致），再判断是否管理员系以决定强制 2FA。
  const meProxy = await proxyBackend(req, { path: '/auth/me' });
  let isAdmin = false;
  if (meProxy.status === 200 && meProxy.body && typeof meProxy.body === 'object') {
    const meBody = meProxy.body as { user?: BackendUser; roles?: string[] };
    if (meBody.user) {
      isAdmin = isAdminRole(toSafeUserFromBackend(meBody.user, meBody.roles).role);
    }
  }

  const body = proxy.body as { enabled?: boolean } | null;
  const res = NextResponse.json({
    enabled: body?.enabled ?? false,
    required: isAdmin,
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
