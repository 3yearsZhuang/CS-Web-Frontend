/**
 * @file 社区聚合标签 API — GET /api/community/tags
 *
 * 返回跨模块的聚合标签列表，用于前端筛选器。
 */
import { NextResponse } from 'next/server';
import { getFeedTags } from '@/modules/community/server';
import { createRequestLogger } from '@/shared/logger';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const log = createRequestLogger(req);
  try {
    const tags = await getFeedTags();
    return NextResponse.json({ tags });
  } catch (err) {
    log.error({ err }, '标签查询失败');
    return NextResponse.json({ error: '获取标签失败' }, { status: 500 });
  }
}
