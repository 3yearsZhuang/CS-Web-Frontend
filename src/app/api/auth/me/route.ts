/**
 * @file 当前用户 API 路由 — GET /api/auth/me
 *
 * 从 cookie 读取 session，返回用户信息或 401。
 * 返回完整 SafeUser（含 displayName, avatarUrl, avatarType）供前端展示。
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/modules/auth/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import { getCookieValue } from '@/shared/security/security';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) {
    return NextResponse.json({ error: '未登录', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  const data = await getSession(token);
  if (!data) {
    return NextResponse.json({ error: '未登录', code: 'UNAUTHORIZED' }, { status: 401 });
  }

  return NextResponse.json({ user: data.user });
}