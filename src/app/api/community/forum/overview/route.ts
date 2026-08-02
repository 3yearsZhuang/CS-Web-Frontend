/**
 * @file 论坛概览 API
 */

import { NextResponse } from 'next/server';
import { listCategories, listTopics } from '@/modules/community/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const categories = await listCategories();

    const hotTopics = (await listTopics({ sort: 'hot', pageSize: 8 })).items;

    const categoryPreviews = await Promise.all(
      categories.map(async (cat) => ({
        ...cat,
        latestTopics: (await listTopics({ category: cat.id, sort: 'latest', pageSize: 3 })).items,
      })),
    );

    return NextResponse.json({ categories: categoryPreviews, hotTopics });
  } catch {
    return NextResponse.json({ error: '获取论坛数据失败' }, { status: 500 });
  }
}