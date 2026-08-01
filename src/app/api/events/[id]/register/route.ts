/**
 * @file 活动报名 API 路由 — POST / DELETE /api/events/[id]/register
 *
 * POST: 报名活动
 * DELETE: 取消报名
 *
 * 安全控制：
 *   - 必须登录（session cookie 校验）
 *   - Origin 白名单校验（防 CSRF）
 *   - Content-Type 必须为 application/json（POST）
 *   - 速率限制（authRateLimiter）
 *   - 报名成功/取消后发送站内通知
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/modules/auth/server';
import {
  registerEvent,
  cancelEventRegistration,
  getEventById,
} from '@/modules/events/server';
import { appBus } from '@/shared/events/event-bus';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import {
  assertAllowedOrigin,
  jsonError,
  getClientIp,
  getCookieValue,
  authRateLimiter,
  errorResponse,
  parseJsonBody,
} from '@/shared/security/security';
import { eventRegistrationSchema } from '@/shared/security/schemas';

export const runtime = 'nodejs';

function getUserIdFromRequest(req: Request): string | null {
  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) return null;
  const session = getSession(token);
  if (!session) return null;
  return session.user.id;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rateKey = `event-register:${ip}`;
  if (!authRateLimiter.check(rateKey)) {
    const retryAfter = authRateLimiter.retryAfterSeconds(rateKey);
    return jsonError('请求过于频繁，请稍后再试', 429, {
      'Retry-After': String(retryAfter),
    });
  }

  const { id } = await params;

  let formData: Record<string, string> | undefined;
  const parsed = await parseJsonBody(req);
  if (parsed.ok) {
    const result = eventRegistrationSchema.safeParse(parsed.body);
    if (result.success && result.data.formData) {
      formData = result.data.formData;
    }
  }

  try {
    const result = registerEvent(userId, id, formData);
    const event = getEventById(id);
    if (event) {
      appBus.emit('event.registered', { userId, eventId: id, eventTitle: event.title });
    }
    return NextResponse.json({ ok: true, registration: result.registration });
  } catch (err) {
    return errorResponse(err, {
      ALREADY_REGISTERED: '你已经报名了该活动',
      FULL: '活动报名已满',
      NOT_FOUND: '活动不存在',
    });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const userId = getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rateKey = `event-cancel:${ip}`;
  if (!authRateLimiter.check(rateKey)) {
    const retryAfter = authRateLimiter.retryAfterSeconds(rateKey);
    return jsonError('请求过于频繁，请稍后再试', 429, {
      'Retry-After': String(retryAfter),
    });
  }

  const { id } = await params;
  const event = getEventById(id);

  try {
    cancelEventRegistration(userId, id);
    if (event) {
      appBus.emit('event.cancelled', { userId, eventId: id, eventTitle: event.title });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err, {
      NOT_FOUND: '报名记录不存在',
      ALREADY_CANCELLED: '报名已取消',
    });
  }
}