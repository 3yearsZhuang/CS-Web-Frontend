/**
 * @file 任务认领列表 API — GET /api/tools/task/[id]/claims
 */
import { NextResponse } from 'next/server';
import { getTaskClaims } from '@/modules/tools/server';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const claims = await getTaskClaims(id);
  return NextResponse.json({ claims });
}
