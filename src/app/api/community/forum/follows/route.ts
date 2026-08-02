/**
 * @file 关注/粉丝列表 API
 *
 * GET /api/community/forum/follows?type=following|followers&page=&page_size=
 * 返回当前登录用户的关注列表或粉丝列表（含互相关注状态）。
 */

import { NextResponse } from 'next/server';
import { listFollowing, listFollowers } from '@/modules/community/server';
import { getSession } from '@/modules/auth/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import {
  assertAllowedOrigin,
  getClientIp,
  getCookieValue,
  forumLikeLimiter,
  jsonError,
} from '@/shared/security/security';
import { createRequestLogger } from '@/shared/logger';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!forumLikeLimiter.check(`forum-follows:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const session = await getSession(token);
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const url = new URL(req.url);
  const type = url.searchParams.get('type') ?? 'following';
  const page = url.searchParams.get('page') ? Number(url.searchParams.get('page')) : 1;
  const pageSize = url.searchParams.get('page_size')
    ? Number(url.searchParams.get('page_size'))
    : undefined;

  const log = createRequestLogger(req);
  try {
    const result =
      type === 'followers'
        ? await listFollowers(session.user.id, { page, pageSize, currentUserId: session.user.id })
        : await listFollowing(session.user.id, { page, pageSize, currentUserId: session.user.id });
    return NextResponse.json(result);
  } catch (err) {
    log.error({ err }, '获取关注列表失败');
    return NextResponse.json({ error: '获取关注列表失败' }, { status: 500 });
  }
}
