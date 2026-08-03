/**
 * @file 登录 API — POST /api/auth/login（BFF 薄转发 → FastAPI）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import {
  clearAuthCookies,
  fetchMeWithPair,
  proxyBackend,
  setAuthCookies,
} from '@/shared/backend-client';
import { loginSchema } from '@/shared/security/schemas';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const parsed = await req.json().catch(() => null);
  const result = loginSchema.safeParse(parsed);
  if (!result.success) {
    return NextResponse.json({ error: '邮箱或密码错误', code: 'AUTH_FAILED' }, { status: 401 });
  }
  const { email, password } = result.data;

  const proxy = await proxyBackend(req, {
    path: '/auth/login-email',
    method: 'POST',
    jsonBody: { email, password },
    skipAuth: true,
  });

  if (proxy.status !== 200) {
    return NextResponse.json({ error: '邮箱或密码错误', code: 'AUTH_FAILED' }, { status: 401 });
  }

  const body = proxy.body as {
    requires_2fa?: boolean;
    two_factor_token?: string | null;
    access_token?: string;
    refresh_token?: string;
  };

  if (body.requires_2fa) {
    const res = NextResponse.json({ requires2FA: true, twoFactorToken: body.two_factor_token ?? null });
    clearAuthCookies(res);
    return res;
  }

  const hasPair = Boolean(body.access_token && body.refresh_token);
  const me = hasPair
    ? await fetchMeWithPair(body as { access_token: string; refresh_token: string })
    : null;

  const res = NextResponse.json({ user: me?.user ?? null });
  if (hasPair) {
    setAuthCookies(res, body as { access_token: string; refresh_token: string });
  } else {
    clearAuthCookies(res);
  }
  return res;
}
