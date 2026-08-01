/**
 * @file 2FA 禁用 API — POST /api/auth/2fa/disable
 */
import { NextResponse } from 'next/server';
import { getSession, disable2FA } from '@/modules/auth/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import { getCookieValue, getClientIp, assertAllowedOrigin, twoFactorLimiter, jsonError } from '@/shared/security/security';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  // CSRF 防御：POST /api/auth/* 统一契约要求 Origin 校验
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) return NextResponse.json({ error: '未登录', code: 'UNAUTHORIZED' }, { status: 401 });
  const session = getSession(token);
  if (!session) return NextResponse.json({ error: '未登录', code: 'UNAUTHORIZED' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { code } = body as { code?: string };

  if (!code) {
    return NextResponse.json({ error: '请输入验证码', code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const ip = getClientIp(req);
  const rateKey = `${ip}:${session.user.id}`;
  if (!twoFactorLimiter.check(rateKey)) {
    const retryAfter = twoFactorLimiter.retryAfterSeconds(rateKey);
    return jsonError('验证尝试过于频繁，请稍后再试', 429, 'RATE_LIMITED', {
      'Retry-After': String(retryAfter),
      'X-RateLimit-Remaining': '0',
    });
  }

  const result = disable2FA(session.user.id, code);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, code: '2FA_FAILED' }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}