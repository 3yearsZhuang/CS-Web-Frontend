/**
 * @file 管理员论坛主题置顶 API
 */

import { NextResponse } from 'next/server';
import { setTopicPinned } from '@/modules/community/server';
import { requireModuleAdmin } from '@/modules/admin/server';
import {
  parseJsonBody,
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  adminActionsLimiter,
} from '@/shared/security/security';
import { pinTopicSchema } from '@/shared/security/schemas';

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
  if (!adminActionsLimiter.check(`forum-topic-pin:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = pinTopicSchema.safeParse(parsed.body);
  if (!result.success) {
    return NextResponse.json(
      { error: '缺少必填字段：pinned (boolean)' },
      { status: 400 },
    );
  }
  const { pinned } = result.data;

  const { id } = await context.params;
  try {
    await setTopicPinned(admin.user.id, id, pinned);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}