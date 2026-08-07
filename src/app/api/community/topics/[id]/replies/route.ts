/**
 * @file 主题回复列表 API — GET /api/community/topics/[id]/replies（BFF 薄转发 → posts 评论端点）
 */
import { NextResponse } from 'next/server';
import { proxyBackend, setAuthCookies, toCommunityComment } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const page = Number(url.searchParams.get('page')) || 1;
  const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 20, 50);

  const proxy = await proxyBackend(req, {
    path: `/community/posts/${encodeURIComponent(id)}/comments?page=${page}&page_size=${pageSize}`,
  });

  const body = (proxy.body ?? {}) as Record<string, unknown>;
  const items = (Array.isArray(body.items) ? body.items : []) as Array<Record<string, unknown>>;
  const res = NextResponse.json({
    replies: items.map(toCommunityComment),
    total: Number(body.total ?? 0),
    page,
    pageSize,
    totalPages: Number(body.total_pages ?? 1),
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
