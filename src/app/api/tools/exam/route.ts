/**
 * @file 用户考试浏览 API — GET /api/tools/exam
 *
 * GET: 列出已发布的考试（分页）
 *
 * 公开浏览，无需登录。
 */
import { NextResponse } from 'next/server';
import { listExams } from '@/modules/tools/server';
import { createRequestLogger } from '@/shared/logger';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);

  const log = createRequestLogger(req);
  try {
    const result = listExams({
      status: 'published',
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 20,
    });
    return NextResponse.json(result);
  } catch (err) {
    log.error({ err }, '获取考试列表失败');
    return NextResponse.json({ error: '获取考试列表失败' }, { status: 500 });
  }
}