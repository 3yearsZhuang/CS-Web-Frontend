/**
 * @file 本人钱包流水 BFF — GET /api/wallet/me/entries。
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const search = new URL(req.url).search;
  const proxy = await proxyBackend(req, { path: `/wallet/me/entries${search}` });
  if (proxy.status !== 200) {
    const res = NextResponse.json(proxy.body ?? { error: '流水读取失败' }, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const b = (proxy.body ?? {}) as Record<string, unknown>;
  const items = ((b.items ?? []) as Record<string, unknown>[]).map((e) => ({
    id: e.id,
    transactionId: e.transaction_id,
    accountId: e.account_id,
    delta: e.delta,
    balanceAfter: e.balance_after,
    entryNo: e.entry_no,
    createdAt: e.created_at,
  }));
  const res = NextResponse.json({
    items,
    total: b.total ?? items.length,
    skip: b.skip ?? 0,
    limit: b.limit ?? items.length,
    totalPages: b.total_pages,
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
