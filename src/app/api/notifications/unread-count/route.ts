/**
 * @file 未读数 API — GET /api/notifications/unread-count（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/notifications/unread-count' });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ count: 0 });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const count = (proxy.body as { unread_count?: number })?.unread_count ?? 0;
  const res = NextResponse.json({ count });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
