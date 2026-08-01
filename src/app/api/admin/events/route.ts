/**
 * @file 管理员活动 API — GET/POST /api/admin/events
 *
 * GET: 列出所有活动（含 plan + archive），管理员查看
 * POST: 创建新活动
 *
 * 安全控制：
 *   - 必须管理员登录（requireAdmin 守卫）
 *   - Origin 白名单（GET + POST，与其他 admin 路由一致）
 *   - POST 需 JSON Content-Type
 *   - 速率限制（adminActionsLimiter）
 *   - 所有写操作记录审计日志（在 events.ts 中完成）
 */
import { NextResponse } from 'next/server';
import { listEvents, createEvent, type EventInput } from '@/modules/events/server';
import { requireAdmin } from '@/modules/admin/server';
import {
  parseJsonBody,
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  adminActionsLimiter,
} from '@/shared/security/security';
import { createEventSchema } from '@/shared/security/schemas';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`events-list:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const events = listEvents();
  return NextResponse.json({ events });
}

export async function POST(req: Request) {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`events-create:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = createEventSchema.safeParse(parsed.body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || '请求格式不正确' },
      { status: 400 },
    );
  }

  const input: EventInput = {
    month: result.data.month,
    date: result.data.date,
    title: result.data.title,
    description: result.data.description ?? null,
    status: result.data.status as EventInput['status'],
    year: result.data.year,
    topics: result.data.topics ?? [],
    tags: result.data.tags ?? [],
    isPinned: false,
    capacity: result.data.capacity ?? 0,
    contentMarkdown: result.data.contentMarkdown ?? null,
    registrationFields: result.data.registrationFields as EventInput['registrationFields'],
  };

  try {
    const event = createEvent(admin.user.id, input);
    return NextResponse.json({ event }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}