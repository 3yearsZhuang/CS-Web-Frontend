/**
 * @file 管理员活动 API — PUT/DELETE /api/admin/events/:id
 *
 * PUT: 更新活动（全量或部分字段）
 * DELETE: 删除活动
 *
 * 安全控制：
 *   - 必须管理员登录（requireAdmin 守卫）
 *   - Origin 白名单（PUT + DELETE，DELETE 为状态变更亦需校验）
 *   - JSON Content-Type（PUT）
 *   - 速率限制（adminActionsLimiter）
 *   - 审计日志（在 events.ts 中完成）
 */
import { NextResponse } from 'next/server';
import { updateEvent, deleteEvent, type EventInput } from '@/modules/events/server';
import { requireAdmin } from '@/modules/admin/server';
import {
  parseJsonBody,
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  adminActionsLimiter,
} from '@/shared/security/security';
import { updateEventSchema } from '@/shared/security/schemas';

export const runtime = 'nodejs';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`events-put:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const { id } = await params;
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = updateEventSchema.safeParse(parsed.body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || '请求格式不正确' },
      { status: 400 },
    );
  }

  const input: Partial<EventInput> = {};
  const data = result.data;
  if (data.month !== undefined) input.month = data.month;
  if (data.date !== undefined) input.date = data.date;
  if (data.title !== undefined) input.title = data.title;
  if (data.description !== undefined) input.description = data.description ?? null;
  if (data.status !== undefined) input.status = data.status as EventInput['status'];
  if (data.year !== undefined) input.year = data.year;
  if (data.topics !== undefined) input.topics = data.topics;
  if (data.tags !== undefined) input.tags = data.tags;
  if (data.capacity !== undefined) input.capacity = data.capacity;
  if (data.contentMarkdown !== undefined) input.contentMarkdown = data.contentMarkdown ?? null;
  if (data.registrationFields !== undefined) input.registrationFields = data.registrationFields as EventInput['registrationFields'];

  try {
    const event = updateEvent(admin.user.id, id, input);
    return NextResponse.json({ event });
  } catch (err) {
    return errorResponse(err);
  }
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
  if (!adminActionsLimiter.check(`events-delete:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const { id } = await params;
  try {
    deleteEvent(admin.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}