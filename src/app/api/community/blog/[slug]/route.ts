/**
 * @file 博客文章详情 API
 *
 * GET    /api/blog/[slug]       — 获取文章详情（含浏览计数）
 * PUT    /api/blog/[slug]       — 编辑文章（作者或管理员）
 * DELETE /api/blog/[slug]       — 删除文章（作者或管理员）
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/modules/auth/server';
import { getPostBySlug, incrementViewCount, updatePost, deletePost } from '@/modules/community/server';
import { isAdminRole } from '@/shared/types';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import { getCookieValue, assertAllowedOrigin } from '@/shared/security/security';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }

  if (post.status !== 'published') {
    const token = getCookieValue(req, AUTH_COOKIE_NAME);
    const session = token ? getSession(token) : null;
    if (!session || (session.user.id !== post.authorId && !isAdminRole(session.user.role))) {
      return NextResponse.json({ error: '无权查看' }, { status: 403 });
    }
  }

  incrementViewCount(post.id);

  return NextResponse.json({ post });
}

export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;
  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const session = getSession(token);
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }

  const isAdmin = isAdminRole(session.user.role);
  try {
    const body = await req.json();
    const updated = updatePost(session.user.id, post.id, body, isAdmin);
    return NextResponse.json({ post: updated });
  } catch (e: unknown) {
    const statusMap: Record<string, number> = {
      NOT_FOUND: 404,
      FORBIDDEN: 403,
      VALIDATION_ERROR: 400,
    };
    const name = e instanceof Error ? e.name : '';
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: statusMap[name] || 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;
  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) return NextResponse.json({ error: '未登录' }, { status: 401 });
  const session = getSession(token);
  if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    return NextResponse.json({ error: '文章不存在' }, { status: 404 });
  }

  const isAdmin = isAdminRole(session.user.role);
  try {
    deletePost(session.user.id, post.id, isAdmin);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const statusMap: Record<string, number> = { NOT_FOUND: 404, FORBIDDEN: 403 };
    const name = e instanceof Error ? e.name : '';
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: statusMap[name] || 500 });
  }
}