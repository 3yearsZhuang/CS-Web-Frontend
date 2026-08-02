/**
 * @file 论坛收藏列表 API
 */

import { NextResponse } from 'next/server';
import { listUserFavorites } from '@/modules/community/server';
import { getSession } from '@/modules/auth/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import {
  assertAllowedOrigin,
  getCookieValue,
  getClientIp,
  forumLikeLimiter,
  jsonError,
} from '@/shared/security/security';
import { createRequestLogger } from '@/shared/logger';

export const runtime = 'nodejs';

export async function GET(req: Request) {
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
  if (!forumLikeLimiter.check(`forum-favorites-list:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const url = new URL(req.url);
  const page = url.searchParams.get('page') ? Number(url.searchParams.get('page')) : 1;
  const pageSize = url.searchParams.get('page_size')
    ? Number(url.searchParams.get('page_size'))
    : undefined;

  const log = createRequestLogger(req);
  try {
    const result = await listUserFavorites(session.user.id, { page, pageSize });
    return NextResponse.json(result);
  } catch (err) {
    log.error({ err }, '获取收藏列表失败');
    return NextResponse.json({ error: '获取收藏列表失败' }, { status: 500 });
  }
}
