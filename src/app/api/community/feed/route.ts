/**
 * @file Feed API — GET /api/community/feed（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { proxyBackend, setAuthCookies, toCommunityPost } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = Number(url.searchParams.get('page')) || 1;
  const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 20, 50);
  const tag = url.searchParams.get('tag') || undefined;
  const type = url.searchParams.get('type') || undefined;
  const seriesId = url.searchParams.get('seriesId') || undefined;

  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (tag) params.set('tag', tag);
  if (type) params.set('type', type);
  if (seriesId) params.set('series_id', seriesId);

  const proxy = await proxyBackend(req, { path: `/community/feed?${params.toString()}` });
  const body = (proxy.body ?? {}) as Record<string, unknown>;
  const items = (Array.isArray(body.items) ? body.items : []) as Array<Record<string, unknown>>;
  const res = NextResponse.json({
    feed: items.map((item) => ({
      ...toCommunityPost(item),
      source: item.source ?? null,
      categoryName: item.category_name ?? null,
      authorName: item.author_name ?? null,
    })),
    total: Number(body.total ?? 0),
    page,
    pageSize,
    totalPages: Number(body.total_pages ?? 1),
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
