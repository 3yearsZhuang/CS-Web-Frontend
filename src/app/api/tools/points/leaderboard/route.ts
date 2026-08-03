/**
 * @file 积分排行榜 API — GET /api/tools/points/leaderboard（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const topN = Number(url.searchParams.get('topN')) || 20;

  const proxy = await proxyBackend(req, { path: `/tools/points/leaderboard?top_n=${topN}` });
  const body = (proxy.body ?? {}) as Record<string, unknown>;
  const items = (Array.isArray(body.leaderboard) ? body.leaderboard : []) as Array<
    Record<string, unknown>
  >;
  const res = NextResponse.json({
    leaderboard: items.map((e) => ({
      userId: String(e.user_id),
      displayName: e.display_name ?? null,
      balance: e.balance ?? 0,
      level: e.level ?? 1,
      levelTitle: e.level_title ?? '新手学徒',
    })),
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
