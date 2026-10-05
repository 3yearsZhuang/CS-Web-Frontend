/**
 * @file Agent 建议收件箱 API — GET /api/agent-inbox（BFF 薄转发）
 *
 * AG-P3-01：后端 GET /agent-inbox 返回裸数组（TZModel camelCase 出参），
 * 此处透传查询参数（page/pageSize → page/page_size），包装为 { items } 供消费方。
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = new URLSearchParams();
  const status = url.searchParams.get('status');
  const type = url.searchParams.get('type');
  if (status) params.set('status', status);
  if (type) params.set('type', type);
  const page = Number(url.searchParams.get('page')) || 1;
  const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 50, 100);
  params.set('page', String(page));
  params.set('page_size', String(pageSize));

  const proxy = await proxyBackend(req, { path: `/agent-inbox?${params.toString()}` });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '获取收件箱失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const items = Array.isArray(proxy.body) ? proxy.body : [];
  const res = NextResponse.json({ items });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
