/**
 * @file 任务列表 API — GET /api/tools/task
 */
import { NextRequest, NextResponse } from 'next/server';
import { listTasks } from '@/modules/tools/server';
import type { TaskCategory } from '@/modules/tools/server';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const status = params.get('status') as 'published' | 'closed' | undefined;
  const category = params.get('category') as string | undefined;
  const page = parseInt(params.get('page') || '1', 10);
  const pageSize = parseInt(params.get('pageSize') || '20', 10);

  const result = await listTasks({
    status: status || 'published',
    category: category as TaskCategory | undefined,
    page,
    pageSize: Math.min(pageSize, 50),
  });

  return NextResponse.json(result);
}
