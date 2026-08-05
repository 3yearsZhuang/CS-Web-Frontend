/**
 * @file 登出 API — POST /api/auth/logout（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, proxyBackend, REFRESH_COOKIE } from '@/shared/backend-client';
import { getCookieValue } from '@/shared/security/security';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const refreshToken = getCookieValue(req, REFRESH_COOKIE);
  await proxyBackend(req, {
    path: '/auth/logout',
    method: 'POST',
    jsonBody: refreshToken ? { refresh_token: refreshToken } : undefined,
    skipAuth: true,
  }).catch(() => null);

  const res = NextResponse.json({ message: '已登出' });
  clearAuthCookies(res);
  return res;
}
