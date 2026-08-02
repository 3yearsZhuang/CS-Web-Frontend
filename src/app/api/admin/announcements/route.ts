/**
 * @file 管理员公告 API — GET/POST /api/admin/announcements
 *
 * GET: 列出所有公告
 * POST: 创建新公告
 */
import { NextResponse } from 'next/server';
import {
  listAllAnnouncements,
  createAnnouncement,
} from '@/modules/announcement/server';
import { requireAdmin } from '@/modules/admin/server';
import { logAdminAction } from '@/shared/security/audit';
import {
  parseJsonBody,
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  adminActionsLimiter,
} from '@/shared/security/security';
import { createAnnouncementSchema } from '@/shared/security/schemas';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`announcements-list:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const result = listAllAnnouncements();
  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`announcements-create:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = createAnnouncementSchema.safeParse(parsed.body);
  if (!result.success) {
    return jsonError(result.error.issues[0]?.message || '请求格式不正确', 400);
  }

  const announcement = await createAnnouncement(admin.user.id, result.data);

  await logAdminAction(admin.user.id, 'create_announcement', null, {
    announcementId: announcement.id,
    title: announcement.title,
    level: announcement.level,
  });

  return NextResponse.json({ announcement }, { status: 201 });
}