/**
 * @file 管理员举报列表 API
 *
 * GET /api/admin/community/reports?status=pending&page=&page_size=
 */

import { NextResponse } from 'next/server';
import { listReports } from '@/modules/community/server';
import { requireModuleAdmin } from '@/modules/admin/server';
import {
  assertAllowedOrigin,
  getClientIp,
  jsonError,
} from '@/shared/security/security';
import { createRequestLogger } from '@/shared/logger';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const admin = await requireModuleAdmin(req, 'forum');
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);

  const url = new URL(req.url);
  const status = (url.searchParams.get('status') as 'pending' | 'resolved' | 'dismissed' | null) ?? undefined;
  const page = url.searchParams.get('page') ? Number(url.searchParams.get('page')) : 1;
  const pageSize = url.searchParams.get('page_size')
    ? Number(url.searchParams.get('page_size'))
    : undefined;

  const log = createRequestLogger(req);
  try {
    const result = await listReports({ status, page, pageSize });
    return NextResponse.json(result);
  } catch (err) {
    log.error({ err }, '获取举报列表失败');
    return NextResponse.json({ error: '获取举报列表失败' }, { status: 500 });
  }
}
