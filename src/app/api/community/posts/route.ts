/**
 * @file 统一帖子 API — GET/POST /api/community/posts（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies, toCommunityPost } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const kind = url.searchParams.get('kind') || 'all';
  const category = url.searchParams.get('category') || undefined;
  const tag = url.searchParams.get('tag') || undefined;
  const seriesId = url.searchParams.get('seriesId') || undefined;
  const authorId = url.searchParams.get('authorId') || undefined;
  const search = url.searchParams.get('search') || undefined;
  const sort = url.searchParams.get('sort') || 'latest';
  const following = url.searchParams.get('following') === 'true';
  const page = Number(url.searchParams.get('page')) || 1;
  const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 20, 50);

  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    sort,
  });
  if (kind !== 'all') params.set('kind', kind);
  if (category) params.set('category', category);
  if (tag) params.set('tag', tag);
  if (seriesId) params.set('series_id', seriesId);
  if (authorId) params.set('author_id', authorId);
  if (search) params.set('search', search);
  if (following) params.set('following', 'true');

  const proxy = await proxyBackend(req, { path: `/community/posts?${params.toString()}` });
  const body = (proxy.body ?? {}) as Record<string, unknown>;
  const items = (Array.isArray(body.items) ? body.items : []) as Array<Record<string, unknown>>;
  const res = NextResponse.json({
    posts: items.map(toCommunityPost),
    total: Number(body.total ?? 0),
    page,
    pageSize,
    totalPages: Number(body.total_pages ?? 1),
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const proxy = await proxyBackend(req, {
    path: '/community/posts',
    method: 'POST',
    jsonBody: {
      kind: body.kind ?? 'topic',
      categoryId: body.categoryId,
      title: body.title,
      contentMarkdown: body.contentMarkdown,
      status: body.status ?? 'published',
      slug: body.slug,
      excerpt: body.excerpt,
      coverImage: body.coverImage,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      seriesId: body.seriesId,
      seriesOrder: body.seriesOrder,
    },
  });

  if (proxy.status !== 200 && proxy.status !== 201) {
    const err = normalizeError(proxy.body, '发布失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ post: toCommunityPost(proxy.body) }, { status: 201 });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
