/**
 * @file 论坛回复嵌套列表 API
 */

import { NextResponse } from 'next/server';
import { listNestedReplies, getReply } from '@/modules/community/server';
import { getSession } from '@/modules/auth/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import { getCookieValue } from '@/shared/security/security';
import { createRequestLogger } from '@/shared/logger';

export const runtime = 'nodejs';

async function optionalUserId(req: Request): Promise<string | undefined> {
  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) return undefined;
  const session = await getSession(token);
  return session?.user.id;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const log = createRequestLogger(req);
  try {
    const { id } = await context.params;
    const currentUserId = await optionalUserId(req);
    const reply = await getReply(id);
    const result = await listNestedReplies({ topicId: reply.topicId, parentReplyId: id });
    return NextResponse.json(result);
  } catch (err) {
    log.error({ err }, '获取楼中楼列表失败');
    return NextResponse.json({ error: '获取楼中楼列表失败' }, { status: 500 });
  }
}
