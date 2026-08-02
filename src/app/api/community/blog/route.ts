/**
 * @file 博客文章列表/创建 API
 *
 * GET  /api/blog          — 获取已发布文章列表
 * POST /api/blog          — 创建草稿（需登录）
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/modules/auth/server';
import { listPosts, createPost } from '@/modules/community/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import { getCookieValue, assertAllowedOrigin, errorResponse } from '@/shared/security/security';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const tag = params.get('tag') || undefined;
  const authorId = params.get('authorId') || undefined;
  const page = parseInt(params.get('page') || '1', 10);
  const pageSize = parseInt(params.get('pageSize') || '20', 10);

  const result = await listPosts({
    status: 'published',
    tag,
    authorId,
    page,
    pageSize: Math.min(pageSize, 50),
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;
  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const session = await getSession(token);
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

  try {
    const body = await req.json();
    const post = await createPost(body, session.user.id);
    return NextResponse.json({ post }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'VALIDATION_ERROR') {
      return errorResponse(e);
    }
    throw e;
  }
}