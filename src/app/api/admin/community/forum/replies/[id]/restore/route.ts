/**
 * @file 管理员论坛回复恢复 API
 */

import { NextResponse } from 'next/server';
import { restoreReply } from '@/modules/community/server';
import { requireModuleAdmin } from '@/modules/admin/server';
import {
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  adminActionsLimiter,
} from '@/shared/security/security';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await requireModuleAdmin(req, 'forum');
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`forum-reply-restore:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const { id } = await context.params;
  try {
    await restoreReply(admin.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}