/**
 * @file 发送验证码 API — POST /api/auth/send-code，生成 6 位验证码并邮件发送
 * 安全：Content-Type + Origin 白名单 + IP/邮箱限流（3 次/分钟防轰炸）；开发环境验证码输出到控制台
 */
import { NextResponse } from 'next/server';
import { generateCode, isEmailRegistered } from '@/modules/auth/server';
import {
  parseJsonBody,
  assertAllowedOrigin,
  jsonError,
  getClientIp,
  sendCodeLimiter,
} from '@/shared/security/security';
import { sendCodeSchema } from '@/shared/security/schemas';
import { createRequestLogger } from '@/shared/logger';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = sendCodeSchema.safeParse(parsed.body);
  if (!result.success) {
    return NextResponse.json({ error: '邮箱格式不正确', code: 'VALIDATION_FAILED' }, { status: 400 });
  }
  const { email } = result.data;

  const ip = getClientIp(req);
  const rateKey = `sendcode:${ip}:${email.toLowerCase()}`;
  if (!sendCodeLimiter.check(rateKey)) {
    const retryAfter = sendCodeLimiter.retryAfterSeconds(rateKey);
    return jsonError('请求过于频繁，请稍后再试', 429, 'RATE_LIMITED', {
      'Retry-After': String(retryAfter),
    });
  }

  // 邮箱已注册检查下沉至 auth/server 层（避免路由直接 getDb）。
  // 验证码生成与 DB 写入由 generateCode 封装。
  if (isEmailRegistered(email)) {
    return NextResponse.json(
      { error: '该邮箱已注册，请直接登录或使用忘记密码功能' },
      { status: 409 },
    );
  }

  const log = createRequestLogger(req);
  try {
    await generateCode(email);
  } catch (err) {
    log.error({ err }, '验证码发送失败');
    return NextResponse.json(
      { error: '验证码发送失败，请稍后再试' },
      { status: 500 },
    );
  }

  const isDev = !process.env.SMTP_HOST;
  return NextResponse.json({
    ok: true,
    message: '验证码已发送',
    ...(isDev ? { devHint: '请查看服务器控制台获取验证码' } : {}),
  });
}