/**
 * @file 论坛用户回复列表 API
 */

import { NextResponse } from 'next/server';
import { listUserReplies } from '@/modules/community/server';
import {
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  forumLikeLimiter,
} from '@/shared/security/security';
import { createRequestLogger } from '@/shared/logger';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!forumLikeLimiter.check(`forum-user-replies:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const { id } = await context.params;
  const url = new URL(req.url);
  const page = url.searchParams.get('page') ? Number(url.searchParams.get('page')) : 1;
  const pageSize = url.searchParams.get('page_size')
    ? Number(url.searchParams.get('page_size'))
    : undefined;

  const log = createRequestLogger(req);
  try {
    const result = listUserReplies(id, page, pageSize);
    return NextResponse.json(result);
  } catch (err) {
    log.error({ err }, '获取用户回复列表失败');
    return NextResponse.json({ error: '获取用户回复列表失败' }, { status: 500 });
  }
}
