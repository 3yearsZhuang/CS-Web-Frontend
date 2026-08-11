/**
 * @file 2FA 验证 API — POST /api/auth/2fa/verify（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import {
  BackendTokenPair,
  clearAuthCookies,
  fetchMeWithPair,
  normalizeError,
  proxyBackend,
  setAuthCookies,
} from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as {
    code?: string;
    mode?: 'setup' | 'login';
    twoFactorToken?: string;
  };
  const { code, mode } = body;

  if (!code) {
    return NextResponse.json({ error: '请输入验证码', code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  if (mode === 'setup') {
    const proxy = await proxyBackend(req, {
      path: '/auth/2fa/verify',
      method: 'POST',
      jsonBody: { mode: 'setup', code },
    });
    if (proxy.status !== 200) {
      const err = normalizeError(proxy.body, '2FA 验证失败');
      const res = NextResponse.json({ error: err.error, code: '2FA_FAILED' }, { status: 400 });
      if (proxy.clearAuth) clearAuthCookies(res);
      return res;
    }
    const res = NextResponse.json({ ok: true });
    if (proxy.authPair) setAuthCookies(res, proxy.authPair);
    return res;
  }

  // login 模式：预认证 token 来自请求体（OAuth 流程经 __Host-oauth_2fa cookie）
  const twoFactorToken = body.twoFactorToken || getOAuthTwoFactorToken(req);
  if (!twoFactorToken) {
    return NextResponse.json({ error: '缺少认证 token', code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const proxy = await proxyBackend(req, {
    path: '/auth/2fa/verify',
    method: 'POST',
    jsonBody: { mode: 'login', code, twoFactorToken },
    skipAuth: true,
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '认证 token 无效或已过期，请重新登录');
    const res = NextResponse.json(
      { error: err.error, code: err.code === 'TOTP_INVALID' ? '2FA_FAILED' : 'UNAUTHORIZED' },
      { status: proxy.status },
    );
    clearAuthCookies(res);
    return res;
  }

  const pairBody = proxy.body as BackendTokenPair;
  const hasPair = Boolean(pairBody.accessToken && pairBody.refreshToken);
  const me = hasPair ? await fetchMeWithPair(pairBody) : null;

  const res = NextResponse.json({ user: me?.user ?? null });
  if (hasPair) {
    setAuthCookies(res, pairBody);
  } else {
    clearAuthCookies(res);
  }
  return res;
}

function getOAuthTwoFactorToken(req: Request): string | null {
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)__Host-oauth_2fa=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}
