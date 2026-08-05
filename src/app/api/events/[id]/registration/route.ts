/**
 * @file 我的报名状态 API — GET/DELETE /api/events/[id]/registration（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const proxy = await proxyBackend(req, {
    path: `/events/${encodeURIComponent(id)}/registration`,
  });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ registration: null });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ registration: proxy.body });
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
    path: `/events/${encodeURIComponent(id)}/registration`,
    method: 'DELETE',
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '取消报名失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ ok: true });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
