/**
 * @file 管理员论坛主题列表 API
 */

import { NextResponse } from 'next/server';
import { listTopics, type ListTopicsFilters } from '@/modules/community/server';
import { requireModuleAdmin } from '@/modules/admin/server';
import {
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  adminActionsLimiter,
} from '@/shared/security/security';
import { createRequestLogger } from '@/shared/logger';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const admin = await requireModuleAdmin(req, 'forum');
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`forum-topic-list:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const url = new URL(req.url);
  const status = url.searchParams.get('status');
  const filters: ListTopicsFilters = {
    categoryId: url.searchParams.get('category') ?? undefined,
    search: url.searchParams.get('search') ?? undefined,
    sort: (url.searchParams.get('sort') as 'latest' | 'hot' | 'top') ?? undefined,
    page: url.searchParams.get('page') ? Number(url.searchParams.get('page')) : undefined,
    pageSize: url.searchParams.get('page_size')
      ? Number(url.searchParams.get('page_size'))
      : undefined,
    status:
      status === 'published' || status === 'hidden' || status === 'deleted'
        ? status
        : undefined,
    includeHidden: !status,
  };

  const log = createRequestLogger(req);
  try {
    const result = listTopics(filters);
    return NextResponse.json(result);
  } catch (err) {
    log.error({ err }, '获取主题列表失败');
    return NextResponse.json({ error: '获取主题列表失败' }, { status: 500 });
  }
}