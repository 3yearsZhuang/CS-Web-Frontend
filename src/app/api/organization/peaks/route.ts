/**
 * @file 峰列表 BFF — GET /api/organization/peaks。
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const search = new URL(req.url).search;
  const proxy = await proxyBackend(req, { path: `/organization/peaks${search}` });
  if (proxy.status !== 200) {
    const res = NextResponse.json(proxy.body ?? { items: [] }, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const b = (proxy.body ?? {}) as Record<string, unknown>;
  const items = ((b.items ?? []) as Record<string, unknown>[]).map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
    fantasyName: p.fantasy_name,
    description: p.description,
    isActive: p.is_active,
  }));
  const res = NextResponse.json({ items, total: b.total ?? items.length });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
