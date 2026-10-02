/**
 * @file 积分排行榜 API — GET /api/tools/points/leaderboard（BFF 薄转发）
 *
 * TOOLS-GOV Slice A（2026-09-14）：后端查询参数是 limit（非 top_n）且返回裸数组
 * （非 {leaderboard:[]} 包装），原实现恒拿空榜。
 */
import { NextResponse } from 'next/server';
import { proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const topN = Number(url.searchParams.get('topN')) || 20;

  const proxy = await proxyBackend(req, { path: `/tools/points/leaderboard?limit=${topN}` });
  if (proxy.status !== 200) {
    return NextResponse.json({ leaderboard: [] }, { status: proxy.status });
  }
  const raw = proxy.body as unknown;
  const items = (
    Array.isArray(raw) ? raw : ((raw as Record<string, unknown> | null)?.leaderboard ?? [])
  ) as Array<Record<string, unknown>>;
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
