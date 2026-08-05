/**
 * @file 发送验证码 API — POST /api/auth/send-code（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { normalizeError, proxyBackend } from '@/shared/backend-client';
import { sendCodeSchema } from '@/shared/security/schemas';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const parsed = await req.json().catch(() => null);
  const result = sendCodeSchema.safeParse(parsed);
  if (!result.success) {
    return NextResponse.json({ error: '邮箱格式不正确', code: 'VALIDATION_FAILED' }, { status: 400 });
  }
  const { email } = result.data;

  const proxy = await proxyBackend(req, {
    path: '/auth/send-code',
    method: 'POST',
    jsonBody: { email },
    skipAuth: true,
  });

  if (proxy.status === 409) {
    return NextResponse.json(
      { error: '该邮箱已注册，请直接登录或使用忘记密码功能', code: 'EMAIL_EXISTS' },
      { status: 409 },
    );
  }
  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '验证码发送失败，请稍后再试');
    return NextResponse.json(err, { status: proxy.status });
  }

  const isDev = !process.env.BACKEND_URL || process.env.BACKEND_URL.includes('localhost');
  return NextResponse.json({
    ok: true,
    message: '验证码已发送',
    ...(isDev ? { devHint: '请查看后端控制台获取验证码' } : {}),
  });
}
