/**
 * @file 会话管理 API — GET/DELETE /api/sessions，列出与远程登出活跃会话
 */
import { NextResponse } from 'next/server';
import { getSession, listUserSessions, deleteSessionById } from '@/modules/auth/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import {
  parseJsonBody,
  assertAllowedOrigin,
  getCookieValue,
  getClientIp,
  jsonError,
  errorResponse,
  profileUpdateLimiter,
} from '@/shared/security/security';
import { z } from 'zod';

export const runtime = 'nodejs';

const deleteSessionSchema = z.object({
  sessionId: z.string().min(1, 'sessionId 不能为空'),
});

async function getUserIdFromRequest(req: Request): Promise<string | null> {
  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) return null;
  const session = await getSession(token);
  if (!session) return null;
  return session.user.id;
}

export async function GET(req: Request) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const sessions = await listUserSessions(userId);
  return NextResponse.json({ sessions });
}

export async function DELETE(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const userId = await getUserIdFromRequest(req);
  if (!userId) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const ip = getClientIp(req);
  const rateKey = `session-delete:${ip}`;
  if (!profileUpdateLimiter.check(rateKey)) {
    const retryAfter = profileUpdateLimiter.retryAfterSeconds(rateKey);
    return jsonError('请求过于频繁，请稍后再试', 429, {
      'Retry-After': String(retryAfter),
    });
  }

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = deleteSessionSchema.safeParse(parsed.body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || '请求格式不正确' },
      { status: 400 },
    );
  }

  try {
    await deleteSessionById(userId, result.data.sessionId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}