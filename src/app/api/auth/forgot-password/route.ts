/**
 * @file 忘记密码申请 API — POST /api/auth/forgot-password，创建重置申请等待管理员审批
 * 安全：Content-Type + Origin 白名单 + IP 限流；防枚举，无论邮箱是否注册都返回相同成功消息
 */
import { NextResponse } from 'next/server';
import { createResetRequest } from '@/modules/auth/server';
import {
  parseJsonBody,
  assertAllowedOrigin,
  jsonError,
  getClientIp,
  forgotPasswordLimiter,
} from '@/shared/security/security';
import { forgotPasswordSchema } from '@/shared/security/schemas';
import { createRequestLogger } from '@/shared/logger';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = forgotPasswordSchema.safeParse(parsed.body);
  if (!result.success) {
    return NextResponse.json({ error: '邮箱格式不正确', code: 'VALIDATION_FAILED' }, { status: 400 });
  }
  const { email } = result.data;

  const ip = getClientIp(req);
  const rateKey = `forgotpwd:${ip}`;
  if (!forgotPasswordLimiter.check(rateKey)) {
    const retryAfter = forgotPasswordLimiter.retryAfterSeconds(rateKey);
    return jsonError('请求过于频繁，请稍后再试', 429, 'RATE_LIMITED', {
      'Retry-After': String(retryAfter),
    });
  }

  const log = createRequestLogger(req);
  try {
    createResetRequest(email);
  } catch (err) {
    log.error({ err }, '创建忘记密码申请失败');
  }

  return NextResponse.json({
    ok: true,
    message: '如该邮箱已注册，您的申请已提交，请等待管理员处理',
  });
}