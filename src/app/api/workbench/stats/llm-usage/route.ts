/**
 * @file LLM 用量统计 API — GET /api/workbench/stats/llm-usage（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const days = url.searchParams.get('days') || '30';

  const proxy = await proxyBackend(req, { path: `/workbench/stats/llm-usage?days=${days}` });

  const status = proxy.status === 200 ? 200 : 401;
  const res = NextResponse.json(proxy.body ?? {}, { status });
  if (proxy.clearAuth && status === 401) clearAuthCookies(res);
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
