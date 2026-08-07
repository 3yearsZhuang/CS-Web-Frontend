/**
 * @file 主题详情/编辑/删除 API — /api/community/topics/[id]（BFF 薄转发 → posts 统一端点）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies, toCommunityPost } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const proxy = await proxyBackend(req, { path: `/community/posts/${encodeURIComponent(id)}` });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ topic: null });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ topic: toCommunityPost(proxy.body) });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as {
    title?: string;
    contentMarkdown?: string;
    categoryId?: string;
  };
  const { id } = await params;

  const proxy = await proxyBackend(req, {
    path: `/community/posts/${encodeURIComponent(id)}`,
    method: 'PUT',
    jsonBody: {
      title: body.title,
      contentMarkdown: body.contentMarkdown,
      categoryId: body.categoryId ? Number(body.categoryId) : undefined,
    },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '保存失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ topic: toCommunityPost(proxy.body) });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const { id } = await params;
  const proxy = await proxyBackend(req, {
    path: `/community/posts/${encodeURIComponent(id)}`,
    method: 'DELETE',
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '删除失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ ok: true });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
