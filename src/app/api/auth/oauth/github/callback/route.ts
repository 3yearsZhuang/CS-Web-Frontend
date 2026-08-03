/**
 * @file GitHub OAuth 回调 — GET /api/auth/oauth/github/callback（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { BACKEND_URL, setAuthCookies } from '@/shared/backend-client';
import { OAUTH_2FA_COOKIE_NAME, OAUTH_2FA_COOKIE_MAX_AGE } from '@/modules/auth/types/constants';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code') || '';
  const state = searchParams.get('state') || '';

  const res = await fetch(
    `${BACKEND_URL}/api/v1/auth/oauth/github/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
    { cache: 'no-store', redirect: 'manual' },
  );

  const body = (await res.json().catch(() => ({}))) as {
    requires_2fa?: boolean;
    two_factor_token?: string | null;
    access_token?: string;
    refresh_token?: string;
    error_code?: string;
  };

  if (res.status !== 200) {
    let errorParam = 'oauth_unknown';
    if (body.error_code === 'OAUTH_STATE_INVALID' || body.error_code === 'OAUTH_STATE_EXPIRED') {
      errorParam = 'oauth_state';
    } else if (body.error_code === 'OAUTH_ERROR' || body.error_code === 'OAUTH_NOT_CONFIGURED') {
      errorParam = 'oauth_failed';
    } else if (body.error_code === 'USER_NOT_ACTIVE') {
      errorParam = 'disabled';
    } else if (body.error_code === 'GITHUB_EMAIL_CONFLICT') {
      errorParam = 'github_email_conflict';
    }
    const redirectUrl = new URL('/login', req.url);
    redirectUrl.searchParams.set('error', errorParam);
    return NextResponse.redirect(redirectUrl, { status: 302 });
  }

  if (body.requires_2fa && body.two_factor_token) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('oauth_2fa', '1');
    const res2 = NextResponse.redirect(loginUrl, { status: 302 });
    res2.cookies.set(OAUTH_2FA_COOKIE_NAME, body.two_factor_token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: OAUTH_2FA_COOKIE_MAX_AGE,
      secure: true,
    });
    return res2;
  }

  const profileUrl = new URL('/profile', req.url);
  const res2 = NextResponse.redirect(profileUrl, { status: 302 });
  if (body.access_token && body.refresh_token) {
    setAuthCookies(res2, { access_token: body.access_token, refresh_token: body.refresh_token });
  }
  return res2;
}
