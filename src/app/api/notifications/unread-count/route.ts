/**
 * @file 未读通知数量 API — GET /api/notifications/unread-count，供导航栏铃铛使用
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/modules/auth/server';
import { getUnreadCount } from '@/modules/notification/server';
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

  const userId = session.user.id;
  const unreadCount = getUnreadCount(userId);

  return NextResponse.json({ unreadCount });
}