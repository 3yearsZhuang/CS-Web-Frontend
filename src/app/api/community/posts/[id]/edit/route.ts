/**
 * @file 帖子编辑 API — PUT /api/community/posts/[id]（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies, toCommunityPost } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const { id } = await params;

  const proxy = await proxyBackend(req, {
    path: `/community/posts/${encodeURIComponent(id)}`,
    method: 'PUT',
    jsonBody: {
      title: body.title,
      contentMarkdown: body.contentMarkdown,
      status: body.status,
      excerpt: body.excerpt,
      coverImage: body.coverImage,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      seriesId: body.seriesId,
      seriesOrder: body.seriesOrder,
    },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '保存失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ post: toCommunityPost(proxy.body) });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
