/**
 * @file 任务详情 API — GET /api/tools/task/[id]
 */
import { NextResponse } from 'next/server';
import { getTaskById } from '@/modules/tools/server';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const task = await getTaskById(id);

  if (!task) {
    return NextResponse.json({ error: '任务不存在' }, { status: 404 });
  }

  return NextResponse.json({ task });
}
