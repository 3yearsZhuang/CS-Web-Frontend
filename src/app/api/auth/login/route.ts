/**
 * @file 登录 API — POST /api/auth/login（BFF 薄转发 → FastAPI）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import {
  BackendTokenPair,
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
    requires2Fa?: boolean;
    twoFactorToken?: string | null;
    accessToken?: string;
    refreshToken?: string;
  };

  // 后端 LoginResponse camel_config() 序列化 requires_2fa → requires2Fa（to_camel 对数字后
  // 下划线首字母大写），此处按后端真实契约读取。
  if (body.requires2Fa) {
    const res = NextResponse.json({ requires2FA: true, twoFactorToken: body.twoFactorToken ?? null });
    clearAuthCookies(res);
    return res;
  }

  const hasPair = Boolean(body.accessToken && body.refreshToken);
  const me = hasPair ? await fetchMeWithPair(body as BackendTokenPair) : null;

  const res = NextResponse.json({ user: me?.user ?? null });
  if (hasPair) {
    setAuthCookies(res, body as BackendTokenPair);
  } else {
    clearAuthCookies(res);
  }
  return res;
}
