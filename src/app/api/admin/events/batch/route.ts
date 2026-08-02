/**
 * @file 管理员活动批量操作 API
 */

import { NextResponse } from 'next/server';
import { batchUpdateEvents } from '@/modules/events/server';
import { requireAdmin } from '@/modules/admin/server';
import {
  parseJsonBody,
  assertAllowedOrigin,
  jsonError,
  adminActionsLimiter,
  getClientIp,
} from '@/shared/security/security';
import { batchEventSchema } from '@/shared/security/schemas';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`events-batch:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = batchEventSchema.safeParse(parsed.body);
  if (!result.success) {
    return jsonError(result.error.issues[0]?.message || '请求格式不正确', 400);
  }

  const { eventIds, status } = result.data;

  const batchResult = await batchUpdateEvents(admin.user.id, eventIds, { status });
  return NextResponse.json(batchResult);
}