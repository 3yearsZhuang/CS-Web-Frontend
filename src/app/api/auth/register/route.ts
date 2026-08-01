/**
 * @file 注册 API — POST /api/auth/register，校验验证码后创建用户与 session
 * 安全：Content-Type + Origin 白名单 + IP 限流（5 次/分钟）+ 验证码一次性 10 分钟有效
 */
import { NextResponse } from 'next/server';
import { createUser, createSession, verifyCode } from '@/modules/auth/server';
import { appBus } from '@/shared/events/event-bus';
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_MAX_AGE,
  COOKIE_SECURE,
} from '@/modules/auth/types/constants';
import {
  parseJsonBody,
  assertAllowedOrigin,
  jsonError,
  getClientIp,
  registerRateLimiter,
  errorResponse,
} from '@/shared/security/security';
import { registerSchema } from '@/shared/security/schemas';
import { createRequestLogger } from '@/shared/logger';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = registerSchema.safeParse(parsed.body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || '请求格式不正确' },
      { status: 400 },
    );
  }
  const { email, password, verificationCode } = result.data;

  const ip = getClientIp(req);
  const rateKey = `register:${ip}`;
  if (!registerRateLimiter.check(rateKey)) {
    const retryAfter = registerRateLimiter.retryAfterSeconds(rateKey);
    return jsonError('注册请求过于频繁，请稍后再试', 429, 'RATE_LIMITED', {
      'Retry-After': String(retryAfter),
    });
  }

  if (!verifyCode(email, verificationCode)) {
    return NextResponse.json({ error: '验证码错误或已过期', code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  let user;
  try {
    user = createUser(email, password);
  } catch (err) {
    return errorResponse(err, {
      EMAIL_EXISTS: '该邮箱已被注册，请直接登录',
    });
  }

  const token = createSession(user.id, ip, req.headers.get('user-agent') || undefined);

  const log = createRequestLogger(req);
  try {
    appBus.emit('user.registered', { userId: user.id });
  } catch (err) {
    log.error({ err }, '发送欢迎通知失败');
  }

  const res = NextResponse.json({ user: { id: user.id, email: user.email } });
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE,
    secure: COOKIE_SECURE,
  });
  return res;
}