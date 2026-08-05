/**
 * @file 禁用 2FA API — POST /api/auth/2fa/disable（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as { code?: string };
  if (!body.code) {
    return NextResponse.json({ error: '请输入验证码', code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const proxy = await proxyBackend(req, {
    path: '/auth/2fa/disable',
    method: 'POST',
    jsonBody: { code: body.code },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '验证码错误');
    const res = NextResponse.json({ error: err.error, code: '2FA_FAILED' }, { status: 400 });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }

  const res = NextResponse.json({ ok: true });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
