/**
 * @file 当前用户已报名活动列表 API — GET /api/events/me/registered
 *
 * 返回当前登录用户已报名且状态为 registered 的活动列表，
 * 按报名时间倒序排列。
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/modules/auth/server';
import { getUserRegisteredEvents } from '@/modules/events/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import { getCookieValue } from '@/shared/security/security';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const session = getSession(token);
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const events = getUserRegisteredEvents(session.user.id);
  return NextResponse.json({ events });
}