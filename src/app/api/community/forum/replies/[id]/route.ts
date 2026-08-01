/**
 * @file 论坛回复详情 API
 */

import { NextResponse } from 'next/server';
import { updateReply, deleteReply } from '@/modules/community/server';
import { getSession } from '@/modules/auth/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import {
  assertAllowedOrigin,
  parseJsonBody,
  getCookieValue,
  errorResponse,
} from '@/shared/security/security';
import { z } from 'zod';

const updateReplyContentSchema = z.object({
  contentMarkdown: z.string().min(1, '内容不能为空').max(10000, '内容最多 10000 个字符'),
});

export const runtime = 'nodejs';

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
  const session = getSession(token);
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = updateReplyContentSchema.safeParse(parsed.body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || '请求格式不正确' },
      { status: 400 },
    );
  }

  const { contentMarkdown } = result.data;

  const { id } = await context.params;
  const isAdmin = session.user.role === 'admin' || session.user.role === 'root';

  try {
    const reply = updateReply(session.user.id, isAdmin, id, contentMarkdown);
    return NextResponse.json({ ok: true, reply });
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
  const session = getSession(token);
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const { id } = await context.params;
  const isAdmin = session.user.role === 'admin' || session.user.role === 'root';

  try {
    deleteReply(session.user.id, isAdmin, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
