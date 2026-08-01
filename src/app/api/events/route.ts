/**
 * @file 活动 API — GET /api/events
 *
 * 公开读取：任何访客可查看活动列表。
 * 支持 category / status / search / tag / page / page_size 参数。
 * 写操作通过 /api/admin/events 路由（需管理员权限）。
 */
import { NextResponse } from 'next/server';
import { listEvents, type EventStatus } from '@/modules/events/server';
import { errorResponse } from '@/shared/security/security';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const status = url.searchParams.get('status');
    const search = url.searchParams.get('search');
    const tag = url.searchParams.get('tag');
    const pageParam = url.searchParams.get('page');
    const pageSizeParam = url.searchParams.get('page_size');

    if (status && status !== 'upcoming' && status !== 'ongoing' && status !== 'ended') {
      return NextResponse.json({ error: 'status 参数无效' }, { status: 400 });
    }

    const page = pageParam ? Math.max(1, parseInt(pageParam, 10)) : undefined;
    const pageSize = pageSizeParam ? Math.max(1, Math.min(100, parseInt(pageSizeParam, 10))) : undefined;

    const result = listEvents({
      status: status as EventStatus | undefined,
      search: search || undefined,
      tag: tag || undefined,
      page,
      pageSize,
    });

    const response = Array.isArray(result)
      ? { events: result }
      : result;

    return NextResponse.json(response);
  } catch (err) {
    return errorResponse(err);
  }
}