/**
 * @file Agent 每周复盘 API — GET /api/agent-weekly-review（BFF 薄转发，AG-P3-04）。
 * 后端按周去重 + 失败静默降级（status=failed 不抛错），此处透传。
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const weekStart = url.searchParams.get('weekStart');
  const path = weekStart
    ? `/agent-weekly-review?weekStart=${encodeURIComponent(weekStart)}`
    : '/agent-weekly-review';

  const proxy = await proxyBackend(req, { path });
  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '获取周复盘失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ review: proxy.body });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
