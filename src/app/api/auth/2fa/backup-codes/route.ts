/**
 * @file 2FA 备用码重新生成 API — POST /api/auth/2fa/backup-codes
 */
import { NextResponse } from 'next/server';
import { getSession, regenerateBackupCodes, is2FAEnabled } from '@/modules/auth/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import { getCookieValue, getClientIp, assertAllowedOrigin, twoFactorLimiter, jsonError } from '@/shared/security/security';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  // CSRF 防御 + 限流：备用码重新生成需验证 TOTP，必须与 disable/verify 一致收紧
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) return NextResponse.json({ error: '未登录', code: 'UNAUTHORIZED' }, { status: 401 });
  const session = getSession(token);
  if (!session) return NextResponse.json({ error: '未登录', code: 'UNAUTHORIZED' }, { status: 401 });

  if (!is2FAEnabled(session.user.id)) {
    return NextResponse.json({ error: '未启用 2FA', code: 'VALIDATION_FAILED' }, { status: 400 });
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

  const body = await req.json().catch(() => ({}));
  const { code } = body as { code?: string };

  if (!code) {
    return NextResponse.json({ error: '请输入验证码', code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const result = regenerateBackupCodes(session.user.id, code);
  if (!result.ok) {
    return NextResponse.json({ error: result.error, code: '2FA_FAILED' }, { status: 400 });
  }

  return NextResponse.json({ codes: result.codes });
}