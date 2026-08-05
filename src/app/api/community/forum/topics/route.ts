/**
 * @file 主题列表/创建 API — GET/POST /api/community/forum/topics（BFF 薄转发 → posts 统一端点）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies, toCommunityPost } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const category = url.searchParams.get('category') || undefined;
  const search = url.searchParams.get('search') || undefined;
  const sort = url.searchParams.get('sort') || 'latest';
  const page = Number(url.searchParams.get('page')) || 1;
  const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 20, 50);

  const params = new URLSearchParams({ kind: 'topic', page: String(page), page_size: String(pageSize), sort });
  if (category) params.set('category', category);
  if (search) params.set('search', search);

  const proxy = await proxyBackend(req, { path: `/community/posts?${params.toString()}` });
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

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as {
    categoryId?: string;
    title?: string;
    contentMarkdown?: string;
  };

  const proxy = await proxyBackend(req, {
    path: '/community/posts',
    method: 'POST',
    jsonBody: {
      kind: 'topic',
      categoryId: body.categoryId ? Number(body.categoryId) : undefined,
      title: body.title,
      contentMarkdown: body.contentMarkdown,
    },
  });

  if (proxy.status !== 200 && proxy.status !== 201) {
    const err = normalizeError(proxy.body, '发布失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ topic: toCommunityPost(proxy.body) }, { status: 201 });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
