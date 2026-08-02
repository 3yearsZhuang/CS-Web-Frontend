/**
 * @file 管理员活动报名列表 API
 */

import { NextResponse } from 'next/server';
import { listRegistrations } from '@/modules/events/server';
import { requireAdmin } from '@/modules/admin/server';
import { assertAllowedOrigin, getClientIp, jsonError, errorResponse, adminActionsLimiter } from '@/shared/security/security';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`event-registrations:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const { id } = await params;

  try {
    const registrations = listRegistrations(id);
    return NextResponse.json({ registrations });
  } catch (err) {
    return errorResponse(err);
  }
}