/**
 * @file 论坛主题回复列表 API
 */

import { NextResponse } from 'next/server';
import { listReplies, createReply } from '@/modules/community/server';
import { getSession } from '@/modules/auth/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import {
  assertAllowedOrigin,
  parseJsonBody,
  getCookieValue,
  getClientIp,
  forumReplyLimiter,
  jsonError,
  errorResponse,
} from '@/shared/security/security';
import { createReplySchema } from '@/shared/security/schemas';
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
    const url = new URL(req.url);
    const page = url.searchParams.get('page') ? Number(url.searchParams.get('page')) : 1;
    const pageSize = url.searchParams.get('page_size')
      ? Number(url.searchParams.get('page_size'))
      : undefined;
    const currentUserId = await optionalUserId(req);

    const result = await listReplies({
      topicId: id,
      page,
      pageSize,
      currentUserId,
    });
    return NextResponse.json(result);
  } catch (err) {
    log.error({ err }, '获取回复列表失败');
    return NextResponse.json({ error: '获取回复列表失败' }, { status: 500 });
  }
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
  const rateKey = `forum-reply:${ip}`;
  if (!forumReplyLimiter.check(rateKey)) {
    const retryAfter = forumReplyLimiter.retryAfterSeconds(rateKey);
    return jsonError('回复过于频繁，请稍后再试', 429, {
      'Retry-After': String(retryAfter),
    });
  }

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = createReplySchema.safeParse(parsed.body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || '请求格式不正确' },
      { status: 400 },
    );
  }

  const { contentMarkdown, parentReplyId } = result.data;

  const { id } = await context.params;

  try {
    const reply = await createReply({
      topicId: id,
      authorId: session.user.id,
      contentMarkdown,
      parentReplyId: parentReplyId ?? null,
    });
    return NextResponse.json({ ok: true, reply }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
