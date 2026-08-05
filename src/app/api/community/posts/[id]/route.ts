/**
 * @file 帖子详情 API — GET /api/community/posts/[id]（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies, toCommunityPost } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const proxy = await proxyBackend(req, {
    path: `/community/posts/${encodeURIComponent(id)}`,
  });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ post: null });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ post: toCommunityPost(proxy.body) });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
