/**
 * @file GitHub OAuth 回调 API 路由 — GET /api/auth/oauth/github/callback
 *
 * 处理 GitHub OAuth 授权回调，校验 state，用 code 换取 access_token，
 * 获取用户信息后创建/绑定本地用户，创建 session 并设置 cookie。
 *
 * 成功后重定向到 /profile（或 /），失败则重定向到 /login 并带上错误参数。
 *
 * 安全控制：
 *   - state 参数校验防 CSRF（一次性使用，10 分钟有效）
 *   - Cookie 设置 httpOnly、sameSite: 'lax'、生产环境启用 Secure
 *   - 所有错误统一重定向到登录页，不泄露具体错误细节
 */
import { NextResponse } from 'next/server';
import { verifyGitHubCallback, createSession, create2FAToken, is2FAEnabled } from '@/modules/auth/server';
import { AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE, OAUTH_2FA_COOKIE_NAME, OAUTH_2FA_COOKIE_MAX_AGE, COOKIE_SECURE } from '@/modules/auth/types/constants';
import { appBus } from '@/shared/events/event-bus';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code') || '';
  const state = searchParams.get('state') || '';

  try {
    const result = await verifyGitHubCallback(code, state);

    // 安全：若已绑定账号启用了 2FA，必须经过 2FA 验证才能创建会话
    // 否则攻击者只需在 GitHub 验证目标邮箱即可绕过本地密码 + 2FA
    //
    // 安全：2FA 预认证 token 通过 HttpOnly cookie 传递，不放入 URL query，
    // 避免经 Referer 头、浏览器历史、服务端日志泄漏。
    // URL 中仅保留 oauth_2fa=1 作为前端展示 2FA UI 的标识（无敏感信息）。
    if (!result.isNewUser && (await is2FAEnabled(result.userId))) {
      const twoFactorToken = await create2FAToken(result.userId);
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('oauth_2fa', '1');
      const res = NextResponse.redirect(loginUrl, { status: 302 });
      res.cookies.set(OAUTH_2FA_COOKIE_NAME, twoFactorToken, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: OAUTH_2FA_COOKIE_MAX_AGE,
        secure: true, // __Host- 前缀强制要求 Secure
      });
      return res;
    }

    const token = await createSession(result.userId, req.headers.get('x-forwarded-for') || undefined, req.headers.get('user-agent') || undefined);

    if (result.isNewUser) {
      appBus.emit('user.registered', { userId: result.userId });
    }

    const profileUrl = new URL('/profile', req.url);
    if (result.autoBound) {
      profileUrl.searchParams.set('github_bound', '1');
    }

    const res = NextResponse.redirect(profileUrl, { status: 302 });
    await res.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: AUTH_COOKIE_MAX_AGE,
      secure: COOKIE_SECURE,
    });
    return res;
  } catch (err) {
    const errorName = err instanceof Error ? err.name : '';
    let errorParam = 'oauth_unknown';

    if (errorName === 'STATE_INVALID' || errorName === 'STATE_EXPIRED') {
      errorParam = 'oauth_state';
    } else if (errorName === 'OAUTH_ERROR') {
      errorParam = 'oauth_failed';
    } else if (errorName === 'ACCOUNT_DISABLED') {
      // createSession 校验到目标账号已被禁用 — 与登录页 error 参数约定一致
      errorParam = 'disabled';
    } else if (errorName === 'GITHUB_EMAIL_CONFLICT') {
      // 邮箱已注册 — 引导用户用密码登录后手动绑定 GitHub
      errorParam = 'github_email_conflict';
    }

    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('error', errorParam);
    return NextResponse.redirect(redirectUrl, { status: 302 });
  }
}