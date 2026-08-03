/**
 * @file 管理端内容列表 API — GET /api/admin/community/forum/topics（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { proxyBackend, setAuthCookies, toCommunityPost } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const kind = url.searchParams.get('kind') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const search = url.searchParams.get('search') || undefined;
  const page = Number(url.searchParams.get('page')) || 1;
  const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 50, 100);

  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize), include_hidden: 'true' });
  if (kind) params.set('kind', kind);
  if (status) params.set('status', status);
  if (search) params.set('search', search);

  const proxy = await proxyBackend(req, { path: `/admin/community/forum/topics?${params.toString()}` });
  const body = (proxy.body ?? {}) as Record<string, unknown>;
  const items = (Array.isArray(body.items) ? body.items : []) as Array<Record<string, unknown>>;
  const res = NextResponse.json({
    topics: items.map(toCommunityPost),
    total: Number(body.total ?? 0),
    page,
    pageSize,
    totalPages: Number(body.total_pages ?? 1),
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
