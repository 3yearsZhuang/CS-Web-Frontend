/**
 * @file 论坛主题详情 API
 */

import { NextResponse } from 'next/server';
import {
  getTopicById,
  updateTopic,
  deleteTopic,
  recordTopicView,
  hashIpForView,
} from '@/modules/community/server';
import { getSession } from '@/modules/auth/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import type { UserRole } from '@/shared/types/role-types';
import {
  assertAllowedOrigin,
  parseJsonBody,
  getCookieValue,
  getClientIp,
  errorResponse,
} from '@/shared/security/security';
import { updateTopicSchema } from '@/shared/security/schemas';
import { createRequestLogger } from '@/shared/logger';

export const runtime = 'nodejs';

async function optionalUser(req: Request): Promise<{ id: string; role: UserRole } | null> {
  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) return null;
  const session = await getSession(token);
  if (!session) return null;
  return { id: session.user.id, role: session.user.role };
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const log = createRequestLogger(req);
  try {
    const { id } = await context.params;
    const currentUser = await optionalUser(req);

    const ipHash = currentUser ? undefined : await hashIpForView(getClientIp(req));
    try {
      await recordTopicView(id);
    } catch (err) {
      log.error({ err }, '记录浏览失败');
    }

    const topic = await getTopicById(id, { currentUserId: currentUser?.id });
    if (!topic) {
      return NextResponse.json({ error: '主题不存在' }, { status: 404 });
    }
    if (
      topic.status !== 'published' &&
      (!currentUser ||
        (currentUser.id !== topic.authorId && currentUser.role !== 'admin' && currentUser.role !== 'root'))
    ) {
      return NextResponse.json({ error: '主题不存在' }, { status: 404 });
    }
    return NextResponse.json({ topic });
  } catch (err) {
    log.error({ err }, '获取主题详情失败');
    return NextResponse.json({ error: '获取主题详情失败' }, { status: 500 });
  }
}

export async function PUT(
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

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = updateTopicSchema.safeParse(parsed.body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || '请求格式不正确' },
      { status: 400 },
    );
  }

  const { id } = await context.params;
  const isAdmin = session.user.role === 'admin' || session.user.role === 'root';

  try {
    const topic = await updateTopic(id, result.data, session.user.id);
    return NextResponse.json({ ok: true, topic });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
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

  const { id } = await context.params;
  const isAdmin = session.user.role === 'admin' || session.user.role === 'root';

  try {
    await deleteTopic(id, session.user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
