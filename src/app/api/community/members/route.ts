/**
 * @file 成员名录 API 路由 — GET /api/members
 *
 * GET: 获取活跃成员列表，支持按技术标签筛选
 */
import { NextResponse } from 'next/server';
import { listMembers, listAllTechTags } from '@/modules/community/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tag = searchParams.get('tag') || undefined;
  const all = searchParams.get('all');

  if (all === 'tags') {
    const tags = await listAllTechTags();
    return NextResponse.json({ tags });
  }

  const members = await listMembers(tag);
  return NextResponse.json({ members });
}