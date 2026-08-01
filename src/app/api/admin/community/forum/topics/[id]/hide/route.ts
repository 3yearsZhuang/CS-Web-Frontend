/**
 * @file 管理员论坛主题隐藏 API
 */

import { NextResponse } from 'next/server';
import { hideTopic } from '@/modules/community/server';
import { requireModuleAdmin } from '@/modules/admin/server';
import {
  parseJsonBody,
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  adminActionsLimiter,
} from '@/shared/security/security';
import { hideTopicSchema } from '@/shared/security/schemas';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = requireModuleAdmin(req, 'forum');
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`forum-topic-hide:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = hideTopicSchema.safeParse(parsed.body);
  const reason = result.success ? result.data.reason : undefined;

  const { id } = await context.params;
  try {
    hideTopic(admin.user.id, id, reason);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}