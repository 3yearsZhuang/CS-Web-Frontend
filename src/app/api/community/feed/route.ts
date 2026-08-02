/**
 * @file 社区聚合 API 路由 — GET /api/community/feed
 *
 * 提供跨模块的统一 Feed 接口，混合 forum topics + blog posts + members。
 *
 * 查询参数：
 *   - kind    — 类型筛选：topic | post | member（可选，默认全部）
 *   - tag     — 标签筛选（跨类型匹配）
 *   - search  — 关键词搜索（跨类型匹配标题/摘要/正文）
 *   - page    — 页码（默认 1）
 *   - pageSize — 每页条数（默认 20，最大 50）
 *
 * 响应：
 *   {
 *     items: FeedItem[],   // 判别联合，前端按 kind 渲染
 *     total, page, pageSize, totalPages
 *   }
 */
import { NextResponse } from 'next/server';
import { getFeed, getFeedStats } from '@/modules/community/server';
import { createRequestLogger } from '@/shared/logger';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const log = createRequestLogger(req);
  try {
    const url = new URL(req.url);
    const { searchParams } = url;

    // stats 快捷查询
    if (searchParams.get('stats') === '1') {
      return NextResponse.json(await getFeedStats());
    }

    const kind = searchParams.get('kind') as 'topic' | 'post' | 'member' | null;
    if (kind && !['topic', 'post', 'member'].includes(kind)) {
      return NextResponse.json({ error: 'kind 参数无效' }, { status: 400 });
    }

    const result = await getFeed({
      kind: kind ?? undefined,
      tag: searchParams.get('tag') ?? undefined,
      search: searchParams.get('search') ?? undefined,
      page: searchParams.get('page') ? Number(searchParams.get('page')) : undefined,
      pageSize: searchParams.get('pageSize')
        ? Number(searchParams.get('pageSize'))
        : undefined,
      excludeMembers: searchParams.get('exclude') === 'member',
    });

    return NextResponse.json(result);
  } catch (err) {
    log.error({ err }, 'Feed 查询失败');
    return NextResponse.json({ error: '获取 Feed 失败' }, { status: 500 });
  }
}
