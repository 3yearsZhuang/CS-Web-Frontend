/**
 * @file 重置密码（随机）API — POST /api/admin/users/[id]/reset-password（BFF 薄转发）
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

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const proxy = await proxyBackend(req, {
    path: `/admin/users/${encodeURIComponent(id)}/reset-password`,
    method: 'POST',
    jsonBody: { password: typeof body.password === 'string' ? body.password : undefined },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '重置失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ ok: true });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
