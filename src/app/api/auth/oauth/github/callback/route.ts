/**
 * @file GitHub OAuth 回调 — GET /api/auth/oauth/github/callback（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { BACKEND_URL, setAuthCookies } from '@/shared/backend-client';
import { OAUTH_2FA_COOKIE_NAME, OAUTH_2FA_COOKIE_MAX_AGE } from '@/modules/auth/types/constants';

export const runtime = 'nodejs';


/**
 * Build browser redirects from the configured public origin instead of the
 * internal Host value that an FRP/reverse proxy may pass to Next.js.
 */
function publicUrl(pathname: string, requestUrl: string): URL {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    try {
      const base = new URL(configured);
      if (base.protocol === 'http:' || base.protocol === 'https:') {
        return new URL(pathname, base);
      }
    } catch {
      // Fall back to the request URL when the deployment value is invalid.
    }
  }
  return new URL(pathname, requestUrl);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code') || '';
  const state = searchParams.get('state') || '';

  const res = await fetch(
    `${BACKEND_URL}/api/v1/auth/oauth/github/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
    { cache: 'no-store', redirect: 'manual' },
  );

  const body = (await res.json().catch(() => ({}))) as {
    requires2Fa?: boolean;
    twoFactorToken?: string | null;
    accessToken?: string;
    refreshToken?: string;
    errorCode?: string;
  };

  if (res.status !== 200) {
    let errorParam = 'oauth_unknown';
    if (body.errorCode === 'OAUTH_STATE_INVALID' || body.errorCode === 'OAUTH_STATE_EXPIRED') {
      errorParam = 'oauth_state';
    } else if (body.errorCode === 'OAUTH_ERROR' || body.errorCode === 'OAUTH_NOT_CONFIGURED') {
      errorParam = 'oauth_failed';
    } else if (body.errorCode === 'USER_NOT_ACTIVE') {
      errorParam = 'disabled';
    } else if (body.errorCode === 'GITHUB_EMAIL_CONFLICT') {
      errorParam = 'github_email_conflict';
    }
    const redirectUrl = publicUrl('/login', req.url);
    redirectUrl.searchParams.set('error', errorParam);
    return NextResponse.redirect(redirectUrl, { status: 302 });
  }

  if (body.requires2Fa && body.twoFactorToken) {
    const loginUrl = publicUrl('/login', req.url);
    loginUrl.searchParams.set('oauth_2fa', '1');
    const res2 = NextResponse.redirect(loginUrl, { status: 302 });
    res2.cookies.set(OAUTH_2FA_COOKIE_NAME, body.twoFactorToken, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: OAUTH_2FA_COOKIE_MAX_AGE,
      secure: true,
    });
    return res2;
  }

  const profileUrl = publicUrl('/profile', req.url);
  const res2 = NextResponse.redirect(profileUrl, { status: 302 });
  if (body.accessToken && body.refreshToken) {
    setAuthCookies(res2, { accessToken: body.accessToken, refreshToken: body.refreshToken });
  }
  return res2;
}
