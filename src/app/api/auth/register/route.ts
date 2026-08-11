/**
 * @file 注册 API — POST /api/auth/register（BFF 薄转发 → FastAPI）
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
import { registerSchema } from '@/shared/security/schemas';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const parsed = await req.json().catch(() => null);
  const result = registerSchema.safeParse(parsed);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || '请求格式不正确' },
      { status: 400 },
    );
  }
  const { email, password, verificationCode } = result.data;

  const proxy = await proxyBackend(req, {
    path: '/auth/register',
    method: 'POST',
    jsonBody: { email, password, code: verificationCode },
    skipAuth: true,
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '注册失败');
    if (err.code === 'EMAIL_EXISTS') {
      return NextResponse.json({ error: '该邮箱已被注册，请直接登录', code: 'EMAIL_EXISTS' }, { status: 409 });
    }
    return NextResponse.json(err, { status: proxy.status });
  }

  const body = proxy.body as BackendTokenPair;
  const hasPair = Boolean(body.accessToken && body.refreshToken);
  const me = hasPair ? await fetchMeWithPair(body) : null;

  const res = NextResponse.json({ user: me?.user ?? null });
  if (hasPair) {
    setAuthCookies(res, body);
  } else {
    clearAuthCookies(res);
  }
  return res;
}
