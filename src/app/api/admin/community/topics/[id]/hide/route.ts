/**
 * @file 内容隐藏 API — POST /api/admin/community/community/topics/[id]/hide（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = await req.json().catch(() => ({}));
  const { id } = await params;

  const proxy = await proxyBackend(req, {
    path: `/admin/community/community/topics/${encodeURIComponent(id)}/hide`,
    method: 'POST',
    jsonBody: (body as Record<string, unknown>).reason
      ? { reason: (body as Record<string, unknown>).reason }
      : undefined,
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '操作失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ ok: true });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
