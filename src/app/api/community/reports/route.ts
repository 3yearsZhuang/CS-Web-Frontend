/**
 * @file 用户提交举报 API
 *
 * POST /api/community/reports
 * body: { targetType: 'topic'|'comment', targetId, reason, detail? }
 */

import { NextResponse } from 'next/server';
import { submitReport } from '@/modules/community/server';
import { getSession } from '@/modules/auth/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import {
  assertAllowedOrigin,
  parseJsonBody,
  getCookieValue,
  getClientIp,
  forumPostLimiter,
  jsonError,
  errorResponse,
} from '@/shared/security/security';
import { reportSchema } from '@/shared/security/schemas';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const session = await getSession(token);
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const ip = getClientIp(req);
  if (!forumPostLimiter.check(`community-report:${ip}`)) {
    const retryAfter = forumPostLimiter.retryAfterSeconds(`community-report:${ip}`);
    return jsonError('操作过于频繁，请稍后再试', 429, {
      'Retry-After': String(retryAfter),
    });
  }

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = reportSchema.safeParse(parsed.body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || '请求格式不正确' },
      { status: 400 },
    );
  }

  const { targetType, targetId, reason, detail } = result.data;
  try {
    const created = await submitReport({
      reporterId: session.user.id,
      targetType,
      targetId,
      reason,
      detail,
    });
    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
