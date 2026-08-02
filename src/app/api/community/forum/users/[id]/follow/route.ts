/**
 * @file 关注/取关切换 API
 *
 * POST /api/community/forum/users/[id]/follow
 * 切换当前登录用户对 [id] 用户的关注状态
 */

import { NextResponse } from 'next/server';
import { toggleFollow, isFollowing } from '@/modules/community/server';
import { getSession } from '@/modules/auth/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import {
  assertAllowedOrigin,
  getClientIp,
  getCookieValue,
  forumLikeLimiter,
  jsonError,
  errorResponse,
} from '@/shared/security/security';

export const runtime = 'nodejs';

/** GET /api/community/forum/users/[id]/follow — 返回当前登录用户对 [id] 的关注状态 */
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) {
    return NextResponse.json({ following: false, loggedIn: false });
  }
  const session = await getSession(token);
  if (!session) {
    return NextResponse.json({ following: false, loggedIn: false });
  }
  const { id: followingId } = await context.params;
  const following = await isFollowing(session.user.id, followingId);
  return NextResponse.json({ following, loggedIn: true });
}

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
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
  const rateKey = `forum-follow:${ip}`;
  if (!forumLikeLimiter.check(rateKey)) {
    const retryAfter = forumLikeLimiter.retryAfterSeconds(rateKey);
    return jsonError('操作过于频繁，请稍后再试', 429, {
      'Retry-After': String(retryAfter),
    });
  }

  const { id: followingId } = await context.params;
  try {
    const result = await toggleFollow(session.user.id, followingId);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return errorResponse(err);
  }
}
