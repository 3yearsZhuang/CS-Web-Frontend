/**
 * @file 评论审核 API — PUT/DELETE /api/admin/community/community/replies/[id]（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as { contentMarkdown?: string };
  const { id } = await params;

  const proxy = await proxyBackend(req, {
    path: `/admin/community/community/replies/${encodeURIComponent(id)}`,
    method: 'PUT',
    jsonBody: { contentMarkdown: body.contentMarkdown },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '保存失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ ok: true });
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
    path: `/admin/community/community/replies/${encodeURIComponent(id)}`,
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
