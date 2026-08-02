/**
 * @file 通知列表 API 路由 — GET /api/notifications
 *
 * 分页查询当前用户的通知列表，支持按已读状态过滤。
 * 同时返回未读总数，方便前端一次性获取所需数据。
 *
 * 安全控制：
 *   - 必须登录（session cookie 校验）
 *   - userId 始终从 session 获取，不接受请求参数传入
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/modules/auth/server';
import { listNotifications, getUnreadCount } from '@/modules/notification/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import { getCookieValue } from '@/shared/security/security';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const session = await getSession(token);
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const userId = session.user.id;
  const url = new URL(req.url);

  const isReadParam = url.searchParams.get('is_read');
  let isRead: boolean | undefined;
  if (isReadParam === 'true') {
    isRead = true;
  } else if (isReadParam === 'false') {
    isRead = false;
  } else if (isReadParam !== null) {
    return NextResponse.json({ error: 'is_read 参数不合法' }, { status: 400 });
  }

  const typeParam = url.searchParams.get('type');
  let type: 'system' | 'admin' | 'activity' | undefined;
  if (typeParam === 'system' || typeParam === 'admin' || typeParam === 'activity') {
    type = typeParam;
  } else if (typeParam !== null) {
    return NextResponse.json({ error: 'type 参数不合法' }, { status: 400 });
  }

  const page = Number(url.searchParams.get('page')) || 1;
  const pageSize = Number(url.searchParams.get('page_size')) || 20;

  const result = await listNotifications(userId, { isRead, type, page, pageSize });
  const unreadCount = await getUnreadCount(userId);

  return NextResponse.json({
    notifications: result.notifications,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
    totalPages: result.totalPages,
    unreadCount,
  });
}