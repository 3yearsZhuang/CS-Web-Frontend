/**
 * @file 论坛概览 API
 */

import { NextResponse } from 'next/server';
import { listCategories, listTopics } from '@/modules/community/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories = listCategories();

    const hotTopics = listTopics({ sort: 'hot', pageSize: 8 }).items;

    const categoryPreviews = categories.map((cat) => {
      const latest = listTopics({ categoryId: cat.id, sort: 'latest', pageSize: 3 }).items;
      return { ...cat, latestTopics: latest };
    });

    return NextResponse.json({ categories: categoryPreviews, hotTopics });
  } catch {
    return NextResponse.json({ error: '获取论坛数据失败' }, { status: 500 });
  }
}