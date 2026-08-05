/**
 * @file 我的积分 API — GET /api/tools/points（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/tools/points' });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ balance: 0, transactions: [] }, { status: 401 });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const body = (proxy.body ?? {}) as Record<string, unknown>;
  const items = (Array.isArray(body.transactions) ? body.transactions : []) as Array<
    Record<string, unknown>
  >;
  const res = NextResponse.json({
    balance: body.balance ?? 0,
    level: body.level ?? 1,
    levelTitle: body.level_title ?? '新手学徒',
    transactions: items.map((t) => ({
      id: String(t.id),
      amount: t.amount ?? 0,
      reason: t.reason ?? '',
      sourceType: t.source_type ?? null,
      balanceAfter: t.balance_after ?? 0,
      createdAt: t.created_at ?? '',
    })),
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
