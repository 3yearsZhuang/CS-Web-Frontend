/**
 * @file 我的入社申请 API — GET /api/join/mine（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies, toJoinApplication } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/join/mine' });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ applications: [] });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const list = Array.isArray(proxy.body) ? proxy.body : [];
  const res = NextResponse.json({ applications: list.map(toJoinApplication) });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
