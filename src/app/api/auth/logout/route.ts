/**
 * @file 登出 API — POST /api/auth/logout，删除 session 并清除 cookie
 * 不校验 Content-Type：body 为空且 Origin 白名单已提供 CSRF 防御
 */
import { NextResponse } from 'next/server';
import { deleteSession } from '@/modules/auth/server';
import { AUTH_COOKIE_NAME, COOKIE_SECURE } from '@/modules/auth/types/constants';
import { assertAllowedOrigin, getCookieValue } from '@/shared/security/security';
import { createRequestLogger } from '@/shared/logger';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const token = getCookieValue(req, AUTH_COOKIE_NAME);

  if (token) {
    const log = createRequestLogger(req);
    try {
      deleteSession(token);
    } catch (err) {
      log.error({ err }, '登出时删除 session 失败');
    }
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
    secure: COOKIE_SECURE,
  });
  return res;
}