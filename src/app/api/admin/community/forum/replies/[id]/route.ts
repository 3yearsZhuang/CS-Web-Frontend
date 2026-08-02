/**
 * @file 管理员论坛回复详情 API
 */

import { NextResponse } from 'next/server';
import { hardDeleteReply } from '@/modules/community/server';
import { requireModuleAdmin } from '@/modules/admin/server';
import {
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  adminActionsLimiter,
} from '@/shared/security/security';

export const runtime = 'nodejs';

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await requireModuleAdmin(req, 'forum');
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`forum-reply-hard-delete:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const { id } = await context.params;
  try {
    await hardDeleteReply(admin.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}