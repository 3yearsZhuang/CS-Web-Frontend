/**
 * @file 论坛分类 API
 */

import { NextResponse } from 'next/server';
import { listCategories } from '@/modules/community/server';
import { createRequestLogger } from '@/shared/logger';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const log = createRequestLogger(req);
  try {
    const categories = await listCategories();
    return NextResponse.json({ items: categories });
  } catch (err) {
    log.error({ err }, '获取版块列表失败');
    return NextResponse.json({ error: '获取版块列表失败' }, { status: 500 });
  }
}
