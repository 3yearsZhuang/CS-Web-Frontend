/**
 * @file 2FA 确认启用 + 登录验证 API — POST /api/auth/2fa/verify
 *
 * 用途 1: 设置阶段 — 验证 TOTP 码并激活 2FA
 * 用途 2: 登录阶段 — 验证 TOTP 码完成登录
 *
 * 安全：
 *   - 2FA 预认证 token 来源优先级：__Host-oauth_2fa cookie（OAuth 流程）
 *     → 请求体 twoFactorToken 字段（密码登录流程）
 *   - OAuth 流程 token 不经 URL 传递，避免 Referer / 历史 / 日志泄漏
 *   - 验证成功后立即清除 OAuth 2FA cookie，并依赖 verify2FAToken 内部的
 *     jti 消费集合封堵重放攻击
 */
import { NextResponse } from 'next/server';
import { getSession, createSession, verify2FAToken, confirm2FA, verify2FA, is2FAEnabled } from '@/modules/auth/server';
import { AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE, OAUTH_2FA_COOKIE_NAME, COOKIE_SECURE } from '@/modules/auth/types/constants';
import { getCookieValue, getClientIp, assertAllowedOrigin, twoFactorLimiter, jsonError } from '@/shared/security/security';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  // CSRF 防御：setup 与 login 两种模式均需校验 Origin（POST /api/auth/* 统一契约）
  // 顺序：Origin → body，与其他 auth 路由一致，避免无 Origin 请求触发 body 解析
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = await req.json().catch(() => ({}));
  const { code, mode } = body as { code?: string; mode?: 'setup' | 'login' };

  if (!code) {
    return NextResponse.json({ error: '请输入验证码', code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  if (mode === 'setup') {
    const token = getCookieValue(req, AUTH_COOKIE_NAME);
    if (!token) return NextResponse.json({ error: '未登录', code: 'UNAUTHORIZED' }, { status: 401 });
    const session = getSession(token);
    if (!session) return NextResponse.json({ error: '未登录', code: 'UNAUTHORIZED' }, { status: 401 });

    // 限流：setup 模式验证 TOTP 激活 2FA，需与 login 模式一致防暴力破解
    const ip = getClientIp(req);
    const rateKey = `${ip}:${session.user.id}`;
    if (!twoFactorLimiter.check(rateKey)) {
      const retryAfter = twoFactorLimiter.retryAfterSeconds(rateKey);
      return jsonError('验证尝试过于频繁，请稍后再试', 429, {
        'Retry-After': String(retryAfter),
        'X-RateLimit-Remaining': '0',
      });
    }

    const result = confirm2FA(session.user.id, code);
    if (!result.ok) {
      return NextResponse.json({ error: result.error, code: '2FA_FAILED' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  // login 模式：优先从 OAuth 2FA cookie 读取 token（OAuth 流程），
  // fallback 到请求体 twoFactorToken 字段（密码登录流程）
  const oauthTwoFactorToken = getCookieValue(req, OAUTH_2FA_COOKIE_NAME);
  const bodyTwoFactorToken = (body as { twoFactorToken?: string }).twoFactorToken;
  const twoFactorToken = oauthTwoFactorToken || bodyTwoFactorToken;
  if (!twoFactorToken) {
    return NextResponse.json({ error: '缺少认证 token', code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const userId = verify2FAToken(twoFactorToken);
  if (!userId) {
    // token 无效或已消费 — 若存在 OAuth 2FA cookie，清除以避免前端反复提交
    if (oauthTwoFactorToken) {
      const res = NextResponse.json({ error: '认证 token 无效或已过期，请重新登录', code: 'UNAUTHORIZED' }, { status: 401 });
      res.cookies.delete(OAUTH_2FA_COOKIE_NAME);
      return res;
    }
    return NextResponse.json({ error: '认证 token 无效或已过期，请重新登录', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rateKey = `${ip}:${userId}`;
  if (!twoFactorLimiter.check(rateKey)) {
    const retryAfter = twoFactorLimiter.retryAfterSeconds(rateKey);
    return jsonError('验证尝试过于频繁，请稍后再试', 429, 'RATE_LIMITED', {
      'Retry-After': String(retryAfter),
      'X-RateLimit-Remaining': '0',
    });
  }

  if (!is2FAEnabled(userId)) {
    return NextResponse.json({ error: '未启用 2FA', code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  if (!verify2FA(userId, code)) {
    return NextResponse.json({ error: '验证码错误', code: '2FA_FAILED' }, { status: 401 });
  }

  // createSession 内部会校验 is_active — 2FA token 签发后 5 分钟内用户可能被管理员禁用
  let sessionToken: string;
  try {
    sessionToken = createSession(userId, ip, req.headers.get('user-agent') || undefined);
  } catch (err) {
    if (err instanceof Error && err.name === 'ACCOUNT_DISABLED') {
      return NextResponse.json({ error: '账号已被禁用', code: 'ACCOUNT_DISABLED' }, { status: 403 });
    }
    throw err;
  }

  const res = NextResponse.json({ user: { id: userId } });
  res.cookies.set(AUTH_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE,
    secure: COOKIE_SECURE,
  });
  // 清除 OAuth 2FA cookie — token 已消费，不再需要
  if (oauthTwoFactorToken) {
    res.cookies.delete(OAUTH_2FA_COOKIE_NAME);
  }
  return res;
}