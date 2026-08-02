/**
 * @file 2FA 初始化设置 API — POST /api/auth/2fa/setup
 *
 * 生成 secret + QR 码 + backup codes（未启用状态）
 */
import { NextResponse } from 'next/server';
import { getSession, setup2FA, is2FAEnabled } from '@/modules/auth/server';
import QRCode from 'qrcode';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import { getCookieValue, getClientIp, assertAllowedOrigin, twoFactorSetupLimiter, jsonError } from '@/shared/security/security';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  // CSRF 防御：POST /api/auth/* 统一契约要求 Origin 校验
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) return NextResponse.json({ error: '未登录', code: 'UNAUTHORIZED' }, { status: 401 });
  const session = await getSession(token);
  if (!session) return NextResponse.json({ error: '未登录', code: 'UNAUTHORIZED' }, { status: 401 });

  if (await is2FAEnabled(session.user.id)) {
    return NextResponse.json({ error: '2FA 已启用，请先禁用', code: 'CONFLICT' }, { status: 400 });
  }

  // 速率限制：setup2FA 每次生成 secret + 加密写库 + 8 个 backup code scrypt 哈希，
  // 需防资源消耗 DoS（3 次/分钟/IP+用户）
  const ip = getClientIp(req);
  const rateKey = `${ip}:${session.user.id}`;
  if (!twoFactorSetupLimiter.check(rateKey)) {
    const retryAfter = twoFactorSetupLimiter.retryAfterSeconds(rateKey);
    return jsonError('操作过于频繁，请稍后再试', 429, 'RATE_LIMITED', {
      'Retry-After': String(retryAfter),
      'X-RateLimit-Remaining': '0',
    });
  }

  const { secret, otpauthURI, backupCodes } = await setup2FA(session.user.id, session.user.email);
  const qrDataUrl = await QRCode.toDataURL(otpauthURI, { width: 240, margin: 1 });

  return NextResponse.json({
    secret,
    otpauthURI,
    qrCode: qrDataUrl,
    backupCodes,
  });
}