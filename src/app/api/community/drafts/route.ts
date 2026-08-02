/**
 * @file 我的草稿箱 API — GET /api/community/drafts
 *
 * 返回当前登录用户的草稿文章（status = 'draft'），仅本人可见。
 */

import { NextResponse } from 'next/server';
import { getUserDrafts } from '@/modules/community/server';
import { getSession } from '@/modules/auth/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import { getCookieValue, assertAllowedOrigin, getClientIp, forumPostLimiter, jsonError } from '@/shared/security/security';
import { createRequestLogger } from '@/shared/logger';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!forumPostLimiter.check(`community-drafts:${ip}`)) {
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
  const page = url.searchParams.get('page') ? Number(url.searchParams.get('page')) : 1;
  const pageSize = url.searchParams.get('pageSize')
    ? Number(url.searchParams.get('pageSize'))
    : undefined;

  const log = createRequestLogger(req);
  try {
    const result = await getUserDrafts(session.user.id, { page, pageSize });
    const totalPages = result.pageSize > 0 ? Math.ceil(result.total / result.pageSize) : 1;
    return NextResponse.json({ ...result, totalPages });
  } catch (err) {
    log.error({ err }, '获取草稿失败');
    return NextResponse.json({ error: '获取草稿失败' }, { status: 500 });
  }
}
