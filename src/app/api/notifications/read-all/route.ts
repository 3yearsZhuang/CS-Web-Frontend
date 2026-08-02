/**
 * @file 全部标记已读 API — POST /api/notifications/read-all
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/modules/auth/server';
import { markAllAsRead } from '@/modules/notification/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import { getCookieValue, assertAllowedOrigin } from '@/shared/security/security';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  // 1. Origin 白名单校验（CSRF 防护 — 与其他 POST 路由一致）
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const session = await getSession(token);
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const userId = session.user.id;
  const count = markAllAsRead(userId);

  return NextResponse.json({ ok: true, count });
}