/**
 * @file 登录 API — POST /api/auth/login，验证凭据后创建 session 并设置 cookie
 * 安全：Content-Type + Origin 白名单 + IP/邮箱限流 + 密码长度上限，防 CSRF/暴力破解/scryptDoS
 */
import { NextResponse } from 'next/server';
import { authenticateUser, createSession, create2FAToken, recordLoginHistory, is2FAEnabled } from '@/modules/auth/server';
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
  loginRateLimiter,
} from '@/shared/security/security';
import { loginSchema } from '@/shared/security/schemas';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = loginSchema.safeParse(parsed.body);
  if (!result.success) {
    return NextResponse.json({ error: '邮箱或密码错误', code: 'AUTH_FAILED' }, { status: 401 });
  }
  const { email, password } = result.data;

  const ip = getClientIp(req);
  const rateKey = `${ip}:${email.toLowerCase()}`;
  if (!loginRateLimiter.check(rateKey)) {
    const retryAfter = loginRateLimiter.retryAfterSeconds(rateKey);
    return jsonError('尝试过于频繁，请稍后再试', 429, 'RATE_LIMITED', {
      'Retry-After': String(retryAfter),
      'X-RateLimit-Remaining': '0',
    });
  }

  const user = await authenticateUser(email, password);
  const userAgent = req.headers.get('user-agent') || undefined;
  if (!user) {
    // 安全：记录失败登录（user_id 为 null，仅记录邮箱用于暴力破解检测）
    // 不区分"用户不存在"与"密码错误"的响应，防邮箱枚举
    recordLoginHistory(null, ip, userAgent, false, email.toLowerCase());
    return NextResponse.json({ error: '邮箱或密码错误', code: 'AUTH_FAILED' }, { status: 401 });
  }

  if (await is2FAEnabled(user.id)) {
    const twoFactorToken = await create2FAToken(user.id);
    return NextResponse.json({ requires2FA: true, twoFactorToken });
  }

  // createSession 内部会校验 is_active — 纵深防御
  // 理论上 authenticateUser 已守卫，但 authenticateUser 通过后到 createSession 之间用户可能被禁用
  // 为防邮箱枚举，禁用账号返回与密码错误一致的 401
  let token: string;
  try {
    token = await createSession(user.id, ip, userAgent);
  } catch (err) {
    if (err instanceof Error && (err.name === 'ACCOUNT_DISABLED' || err.name === 'USER_NOT_FOUND')) {
      // 安全：记录禁用账号的失败登录
      await recordLoginHistory(user.id, ip, userAgent, false, email.toLowerCase());
      return NextResponse.json({ error: '邮箱或密码错误', code: 'AUTH_FAILED' }, { status: 401 });
    }
    throw err;
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