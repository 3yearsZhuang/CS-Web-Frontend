/**
 * @file 本人钱包 BFF — GET /api/wallet/me。
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/wallet/me' });
  if (proxy.status !== 200) {
    const res = NextResponse.json(proxy.body ?? { error: '钱包读取失败' }, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const b = (proxy.body ?? {}) as Record<string, unknown>;
  const res = NextResponse.json({
    userId: b.user_id,
    accountId: b.account_id,
    balance: b.balance,
    escrowTotal: b.escrow_total,
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
