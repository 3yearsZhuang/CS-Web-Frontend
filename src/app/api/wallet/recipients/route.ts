/**
 * @file 收款人搜索 BFF — GET /api/wallet/recipients?q=。
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const search = new URL(req.url).search;
  const proxy = await proxyBackend(req, { path: `/wallet/recipients${search}` });
  if (proxy.status !== 200) {
    const res = NextResponse.json(proxy.body ?? { items: [] }, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const list = (Array.isArray(proxy.body) ? proxy.body : []) as Record<string, unknown>[];
  const res = NextResponse.json({
    items: list.map((r) => ({
      userId: r.user_id,
      displayName: r.display_name,
      username: r.username,
    })),
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
