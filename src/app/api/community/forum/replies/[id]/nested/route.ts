/**
 * @file 论坛回复嵌套列表 API
 */

import { NextResponse } from 'next/server';
import { listNestedReplies } from '@/modules/community/server';
import { getSession } from '@/modules/auth/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import { getCookieValue } from '@/shared/security/security';
import { createRequestLogger } from '@/shared/logger';

export const runtime = 'nodejs';

function optionalUserId(req: Request): string | undefined {
  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) return undefined;
  const session = getSession(token);
  return session?.user.id;
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const log = createRequestLogger(req);
  try {
    const { id } = await context.params;
    const currentUserId = optionalUserId(req);
    const result = listNestedReplies(id, currentUserId);
    return NextResponse.json(result);
  } catch (err) {
    log.error({ err }, '获取楼中楼列表失败');
    return NextResponse.json({ error: '获取楼中楼列表失败' }, { status: 500 });
  }
}
