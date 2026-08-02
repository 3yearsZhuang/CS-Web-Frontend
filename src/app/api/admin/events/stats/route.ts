/**
 * @file 管理员活动统计 API — GET /api/admin/events/stats
 *
 * 返回所有活动的报名统计汇总（注册人数、取消人数、候补人数等）。
 */
import { NextResponse } from 'next/server';
import { getEventStats } from '@/modules/events/server';
import { requireAdmin } from '@/modules/admin/server';
import {
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  adminActionsLimiter,
} from '@/shared/security/security';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`events-stats:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const stats = getEventStats();

  return NextResponse.json({ stats });
}