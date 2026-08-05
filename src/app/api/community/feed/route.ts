/**
 * @file Feed API — GET /api/community/feed（BFF 薄转发）
 * - topic/post：转发到后端 /community/posts，items 映射为 FeedItem[]（kind + data）。
 * - member：转发到后端 /community/members（返回数组），映射为 kind=member 的 FeedItem[]。
 */
import { NextResponse } from 'next/server';
import { proxyBackend, setAuthCookies, toCommunityPost, toMember } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = Number(url.searchParams.get('page')) || 1;
  const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 20, 50);
  const kind = url.searchParams.get('kind') || undefined;
  const search = url.searchParams.get('search') || undefined;
  const tag = url.searchParams.get('tag') || undefined;
  const following = url.searchParams.get('feed') === 'following';

  // 成员：走 /community/members（返回数组，无分页）
  if (kind === 'member') {
    const mparams = new URLSearchParams({ sort: 'active', limit: String(pageSize) });
    if (search) mparams.set('search', search);
    if (tag) mparams.set('tag', tag);

    const proxy = await proxyBackend(req, { path: `/community/members?${mparams.toString()}` });
    const list = Array.isArray(proxy.body) ? proxy.body : [];

    const items = list.map((m) => ({
      kind: 'member',
      sortAt: (m.joined_at as string) || '',
      data: toMember(m),
    }));
    const res = NextResponse.json({
      items,
      total: items.length,
      page,
      pageSize,
      totalPages: 1,
    });
    if (proxy.authPair) setAuthCookies(res, proxy.authPair);
    return res;
  }

  // 内容（topic/post）：转发到 /community/posts
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
    sort: 'latest',
  });
  if (kind === 'topic' || kind === 'post') params.set('kind', kind);
  if (search) params.set('search', search);
  if (tag) params.set('tag', tag);
  if (following) params.set('following', 'true');

  const proxy = await proxyBackend(req, { path: `/community/posts?${params.toString()}` });
  const body = (proxy.body ?? {}) as Record<string, unknown>;
  const items = (Array.isArray(body.items) ? body.items : []) as Array<Record<string, unknown>>;

  const feed = items.map((item) => ({
    kind: item.kind === 'post' ? 'post' : 'topic',
    sortAt: (item.published_at as string) || (item.created_at as string) || '',
    data: toCommunityPost(item),
  }));

  const total = Number(body.total ?? 0);
  const backendTotalPages = Number(body.total_pages);
  const computedPages = pageSize > 0 ? Math.ceil(total / pageSize) : 1;
  const totalPages = Number.isFinite(backendTotalPages) && backendTotalPages > 0 ? backendTotalPages : computedPages;
  const res = NextResponse.json({
    items: feed,
    total,
    page,
    pageSize,
    totalPages: totalPages > 0 ? totalPages : 1,
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
