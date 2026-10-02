/**
 * @file 我的积分 API — GET /api/tools/points（BFF 薄转发）
 *
 * TOOLS-GOV Slice A（2026-09-14）：后端真实路由是 /tools/points/me（原路径 404）；
 * 输出对齐消费方 use-tasks.ts 读取的 { profile: PointsProfile } 包装；
 * 非 200 透传后端状态码（不再一律伪装 401）。
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/tools/points/me' });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '获取积分失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const body = (proxy.body ?? {}) as Record<string, unknown>;
  const items = (Array.isArray(body.transactions) ? body.transactions : []) as Array<
    Record<string, unknown>
  >;
  const res = NextResponse.json({
    profile: {
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
    },
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
