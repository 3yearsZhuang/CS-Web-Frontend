/**
 * @file Agent 每日学习简报 API — GET /api/agent-briefing（BFF 薄转发，AG-P3-03）。
 * 后端按日去重 + 失败静默降级（status=failed 不抛错），此处透传。
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const date = url.searchParams.get('date');
  const path = date ? `/agent-briefing?date=${encodeURIComponent(date)}` : '/agent-briefing';

  const proxy = await proxyBackend(req, { path });
  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '获取简报失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ briefing: proxy.body });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
