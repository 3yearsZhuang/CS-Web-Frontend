/**
 * @file 论坛点赞 API
 */

import { NextResponse } from 'next/server';
import { toggleLike, type LikeTargetType } from '@/modules/community/server';
import { getSession } from '@/modules/auth/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import {
  assertAllowedOrigin,
  parseJsonBody,
  getCookieValue,
  getClientIp,
  forumLikeLimiter,
  jsonError,
  errorResponse,
} from '@/shared/security/security';
import { likeSchema } from '@/shared/security/schemas';

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
  const rateKey = `forum-like:${ip}`;
  if (!forumLikeLimiter.check(rateKey)) {
    const retryAfter = forumLikeLimiter.retryAfterSeconds(rateKey);
    return jsonError('操作过于频繁，请稍后再试', 429, {
      'Retry-After': String(retryAfter),
    });
  }

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = likeSchema.safeParse(parsed.body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || '请求格式不正确' },
      { status: 400 },
    );
  }
  const { targetType, targetId } = result.data;
  const mappedType: 'post' | 'comment' = targetType === 'topic' ? 'post' : 'comment';

  try {
    const result = await toggleLike(targetId, mappedType, session.user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return errorResponse(err);
  }
}
