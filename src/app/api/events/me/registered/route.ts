/**
 * @file 我的报名列表 API — GET /api/events/me/registered（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies, toEventItem } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/events/me/registered' });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ events: [] });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const list = Array.isArray(proxy.body) ? proxy.body : [];
  const res = NextResponse.json({ events: list.map(toEventItem) });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
