/**
 * @file 全站搜索 API — GET /api/search?q=&scope=&limit=（BFF 薄转发）
 * 转发到后端 /api/v1/search，透传 query/scope/results。
 */
import { NextResponse } from 'next/server';
import { proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim().slice(0, 80);
  const scope = url.searchParams.get('scope') || 'all';
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 5, 1), 10);

  // q 为空：直接返回空结果，不请求后端
  if (!q) {
    return NextResponse.json({ query: '', scope, results: {} });
  }

  const params = new URLSearchParams({ q, scope, limit: String(limit) });
  const proxy = await proxyBackend(req, { path: `/search?${params.toString()}` });
  const body = (proxy.body ?? {}) as Record<string, unknown>;

  const res = NextResponse.json({
    query: q,
    scope: (body.scope as string) ?? scope,
    results: (body.results ?? {}) as Record<string, unknown>,
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
