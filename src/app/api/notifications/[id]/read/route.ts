/**
 * @file 标记单条通知已读 API 路由 — POST /api/notifications/[id]/read
 *
 * 将指定通知标记为已读。
 * 校验通知存在且属于当前用户，否则返回相应错误。
 *
 * 安全控制：
 *   - 必须登录（session cookie 校验）
 *   - Origin / Referer 必须命中白名单（CSRF 防护）
 *   - 校验通知归属权，防止越权操作他人通知
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/modules/auth/server';
import { markAsRead } from '@/modules/notification/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import { getCookieValue, assertAllowedOrigin, errorResponse } from '@/shared/security/security';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
  const { id: notificationId } = await params;

  try {
    markAsRead(userId, notificationId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}