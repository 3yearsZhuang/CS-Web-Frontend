/**
 * @file 博客点赞 API — POST /api/blog/[slug]/like
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/modules/auth/server';
import { getPostBySlug, toggleBlogLike } from '@/modules/community/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import { getCookieValue, assertAllowedOrigin } from '@/shared/security/security';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;
  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const session = await getSession(token);
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }

  const result = await toggleBlogLike(post.id, session.user.id);
  return NextResponse.json(result);
}