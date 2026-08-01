/**
 * @file 管理员公告 CRUD API — GET/PATCH/DELETE /api/admin/announcements/[id]
 *
 * GET: 获取单个公告
 * PATCH: 更新公告（标题、内容、级别、状态等）
 * DELETE: 删除公告
 */
import { NextResponse } from 'next/server';
import {
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
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
import { updateAnnouncementSchema } from '@/shared/security/schemas';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`announcements-get:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const { id } = await params;
  const announcement = getAnnouncementById(id);
  if (!announcement) {
    return jsonError('公告不存在', 404);
  }

  return NextResponse.json({ announcement });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`announcements-update:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = updateAnnouncementSchema.safeParse(parsed.body);
  if (!result.success) {
    return jsonError(result.error.issues[0]?.message || '请求格式不正确', 400);
  }

  const { id } = await params;
  const announcement = updateAnnouncement(id, result.data);
  if (!announcement) {
    return jsonError('公告不存在', 404);
  }

  logAdminAction(admin.user.id, 'update_announcement', null, {
    announcementId: id,
    changes: result.data,
  });

  return NextResponse.json({ announcement });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`announcements-delete:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const { id } = await params;
  const existed = deleteAnnouncement(id);
  if (!existed) {
    return jsonError('公告不存在', 404);
  }

  logAdminAction(admin.user.id, 'delete_announcement', null, {
    announcementId: id,
  });

  return NextResponse.json({ ok: true });
}