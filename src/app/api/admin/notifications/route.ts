/**
 * @file 管理员通知 API — GET/POST /api/admin/notifications
 *
 * GET: 查询最近的群发记录（去重后的代表条目）
 * POST: 群发站内通知给所有启用中的用户
 *
 * 安全控制：
 *   - 必须管理员登录（requireAdmin 守卫）
 *   - Origin 白名单（GET + POST，与其他 admin 路由一致）
 *   - POST 需 JSON Content-Type
 *   - 速率限制（adminActionsLimiter）
 *   - POST 记录审计日志（logAdminAction）
 */
import { NextResponse } from 'next/server';
import {
  createNotificationForAll,
  listRecentBroadcasts,
} from '@/modules/notification/server';
import { requireAdmin } from '@/modules/admin/server';
import { logAdminAction } from '@/shared/security/audit';
import {
  parseJsonBody,
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  adminActionsLimiter,
} from '@/shared/security/security';
import { broadcastNotificationSchema } from '@/shared/security/schemas';

// better-sqlite3 是原生模块，必须使用 Node.js runtime（非 Edge）
export const runtime = 'nodejs';

export async function GET(req: Request) {
  // 1. 管理员身份校验
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  // 2. Origin 白名单校验
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  // 3. 速率限制
  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`notif-list:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));

  const broadcasts = listRecentBroadcasts(limit);
  return NextResponse.json({ broadcasts });
}

export async function POST(req: Request) {
  // 1. 管理员身份校验
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  // 2. Origin 白名单校验
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  // 3. 速率限制
  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`notif-broadcast:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  // 4. Content-Type + JSON 解析
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = broadcastNotificationSchema.safeParse(parsed.body);
  if (!result.success) {
    return jsonError(result.error.issues[0]?.message || '请求格式不正确', 400);
  }

  const { title, content, type } = result.data;

  // 5. 群发
  const count = createNotificationForAll(
    type,
    title.trim(),
    content.trim() || null,
    admin.user.id,
  );

  // 6. 审计日志
  logAdminAction(admin.user.id, 'broadcast_notification', null, {
    title,
    contentPreview: content ? content.slice(0, 80) : null,
    type,
    recipientCount: count,
  });

  return NextResponse.json({ ok: true, count }, { status: 201 });
}