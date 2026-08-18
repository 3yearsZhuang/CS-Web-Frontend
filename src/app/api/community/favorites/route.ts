/**
 * @file 收藏列表 API — GET /api/community/favorites（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import {
  arrayFrom,
  bodyOrEmpty,
  clearAuthCookies,
  okJson,
  proxyBackend,
  toCommunityPost,
} from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = Number(url.searchParams.get('page')) || 1;
  const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 20, 50);

  const proxy = await proxyBackend(req, {
    path: `/community/favorites?page=${page}&page_size=${pageSize}`,
  });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ posts: [], total: 0 });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const body = bodyOrEmpty(proxy);
  const items = arrayFrom(body, 'items');
  return okJson({
    posts: items.map(toCommunityPost),
    total: Number(body.total ?? 0),
    page,
    pageSize,
    totalPages: Number(body.total_pages ?? 1),
  }, proxy);
}
