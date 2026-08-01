/**
 * @file 统一社区内容 API /api/community/posts
 *
 * 合并原论坛主题与博客文章为统一的「帖子」资源（community_posts，kind 判别）。
 * - GET  列表：支持 kind=topic|post|all（默认 all）、category、tag、authorId、search、sort、分页
 * - POST 创建：需登录；body 必须含 kind，topic 需 categoryId，post 默认 draft
 *
 * 响应统一信封：{ data }；错误：{ error, code }
 */

import { NextRequest } from 'next/server';
import {
  listTopics,
  createTopic,
  listPosts,
  createPost,
  getCategoryBySlug,
  type ListTopicsFilters,
  type BlogListOptions,
} from '@/modules/community/server';
import type { PostKind } from '@/modules/community/types';
import { getSession } from '@/modules/auth/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import {
  assertAllowedOrigin,
  getCookieValue,
  getClientIp,
  forumPostLimiter,
  jsonError,
  errorResponse,
  jsonSuccess,
} from '@/shared/security/security';
import { createTopicSchema } from '@/shared/security/schemas';
import { createRequestLogger } from '@/shared/logger';

export const runtime = 'nodejs';

function parseKind(raw: string | null): PostKind | 'all' | null {
  if (!raw || raw === 'all') return 'all';
  if (raw === 'topic' || raw === 'post') return raw;
  return null;
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;

  const kind = parseKind(params.get('kind'));
  if (kind === null) {
    return jsonError('kind 参数无效（应为 topic / post / all）', 400);
  }

  const categorySlug = params.get('category') ?? undefined;
  let categoryId: string | undefined;
  if (categorySlug) {
    const cat = getCategoryBySlug(categorySlug);
    if (!cat) {
      return jsonError('分类不存在', 404, 'CATEGORY_NOT_FOUND');
    }
    categoryId = cat.id;
  }

  const page = parseInt(params.get('page') || '1', 10);
  const pageSize = Math.min(parseInt(params.get('pageSize') || '20', 10) || 20, 50);

  try {
    if (kind === 'topic') {
      const filters: ListTopicsFilters = {
        categoryId,
        search: params.get('search') ?? undefined,
        sort: (params.get('sort') as ListTopicsFilters['sort']) ?? 'latest',
        authorId: params.get('authorId') ?? undefined,
        page,
        pageSize,
      };
      const result = listTopics(filters);
      return jsonSuccess(result);
    }

    if (kind === 'post') {
      const options: BlogListOptions = {
        status: 'published',
        category: categorySlug,
        tag: params.get('tag') ?? undefined,
        authorId: params.get('authorId') ?? undefined,
        page,
        pageSize,
      };
      const result = listPosts(options);
      return jsonSuccess(result);
    }

    // kind = all：合并两类，按更新时间倒序，分页以 topic 的翻页参数为准
    const topicFilters: ListTopicsFilters = {
      categoryId,
      search: params.get('search') ?? undefined,
      sort: 'latest',
      page,
      pageSize,
    };
    const topics = listTopics(topicFilters);
    const postOptions: BlogListOptions = {
      status: 'published',
      category: categorySlug,
      tag: params.get('tag') ?? undefined,
      authorId: params.get('authorId') ?? undefined,
      page,
      pageSize,
    };
    const posts = listPosts(postOptions);

    return jsonSuccess({
      topics,
      posts,
      total: (topics.total ?? 0) + (posts.total ?? 0),
      page,
      pageSize,
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) return jsonError('未登录', 401, 'UNAUTHENTICATED');
  const session = getSession(token);
  if (!session) return jsonError('未登录', 401, 'UNAUTHENTICATED');

  const ip = getClientIp(req);
  const rateKey = `community-post:${ip}`;
  if (!forumPostLimiter.check(rateKey)) {
    const retryAfter = forumPostLimiter.retryAfterSeconds(rateKey);
    return jsonError('发布过于频繁，请稍后再试', 429, {
      'Retry-After': String(retryAfter),
    });
  }

  const log = createRequestLogger(req);
  try {
    const body = await req.json();
    const kind: PostKind = body?.kind === 'post' ? 'post' : 'topic';

    if (kind === 'topic') {
      const parsed = createTopicSchema.safeParse(body);
      if (!parsed.success) {
        return jsonError(
          parsed.error.issues[0]?.message || '请求格式不正确',
          400,
          'VALIDATION_ERROR',
        );
      }
      const { categoryId, title, contentMarkdown } = parsed.data;
      const topic = createTopic(session.user.id, { categoryId, title, contentMarkdown });
      return jsonSuccess({ topic }, 201);
    }

    // kind === 'post'
    const post = createPost(session.user.id, {
      ...body,
      kind: 'post',
    });
    return jsonSuccess({ post }, 201);
  } catch (err) {
    log.error({ err }, '创建帖子失败');
    return errorResponse(err);
  }
}
