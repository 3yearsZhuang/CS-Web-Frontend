/**
 * @file 忘记密码 API — POST /api/auth/forgot-password（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { proxyBackend } from '@/shared/backend-client';
import { forgotPasswordSchema } from '@/shared/security/schemas';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const parsed = await req.json().catch(() => null);
  const result = forgotPasswordSchema.safeParse(parsed);
  if (!result.success) {
    return NextResponse.json({ error: '邮箱格式不正确', code: 'VALIDATION_FAILED' }, { status: 400 });
  }
  const { email } = result.data;

  await proxyBackend(req, {
    path: '/auth/forgot-password',
    method: 'POST',
    jsonBody: { email },
    skipAuth: true,
  }).catch(() => null);

  return NextResponse.json({
    ok: true,
    message: '如该邮箱已注册，您的申请已提交，请等待管理员处理',
  });
}
