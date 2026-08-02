/**
 * @file 论坛主题列表 API
 */

import { NextResponse } from 'next/server';
import { listTopics, createTopic, getCategoryBySlug, type ListTopicsFilters } from '@/modules/community/server';
import { getSession } from '@/modules/auth/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import {
  assertAllowedOrigin,
  parseJsonBody,
  getCookieValue,
  getClientIp,
  forumPostLimiter,
  jsonError,
  errorResponse,
} from '@/shared/security/security';
import { createTopicSchema } from '@/shared/security/schemas';
import { createRequestLogger } from '@/shared/logger';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const log = createRequestLogger(req);
  try {
    const url = new URL(req.url);
    const categorySlug = url.searchParams.get('category') ?? undefined;

    let categoryId: string | undefined;
    if (categorySlug) {
      const cat = await getCategoryBySlug(categorySlug);
      if (!cat) {
        return NextResponse.json({ error: '版块不存在' }, { status: 404 });
      }
      categoryId = cat.id;
    }

    const filters: ListTopicsFilters = {
      categoryId,
      search: url.searchParams.get('search') ?? undefined,
      sort: (url.searchParams.get('sort') as 'latest' | 'hot' | 'top') ?? undefined,
      page: url.searchParams.get('page') ? Number(url.searchParams.get('page')) : undefined,
      pageSize: url.searchParams.get('page_size')
        ? Number(url.searchParams.get('page_size'))
        : undefined,
    };
    const result = listTopics(filters);
    return NextResponse.json(result);
  } catch (err) {
    log.error({ err }, '获取主题列表失败');
    return NextResponse.json({ error: '获取主题列表失败' }, { status: 500 });
  }
}

export async function POST(req: Request) {
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
  const rateKey = `forum-post:${ip}`;
  if (!forumPostLimiter.check(rateKey)) {
    const retryAfter = forumPostLimiter.retryAfterSeconds(rateKey);
    return jsonError('发帖过于频繁，请稍后再试', 429, {
      'Retry-After': String(retryAfter),
    });
  }

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = createTopicSchema.safeParse(parsed.body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || '请求格式不正确' },
      { status: 400 },
    );
  }

  const { categoryId, title, contentMarkdown } = result.data;

  try {
    const topic = await createTopic({ categoryId, title, contentMarkdown, authorId: session.user.id });
    return NextResponse.json({ ok: true, topic }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
