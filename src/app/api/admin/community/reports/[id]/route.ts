/**
 * @file 管理员处理举报 API
 *
 * POST /api/admin/community/reports/[id]?action=resolve|dismiss
 * - resolve：标记举报为已处理（违规已确认，内容处置由审核后端另行执行）
 * - dismiss：驳回举报（认定无违规）
 */

import { NextResponse } from 'next/server';
import { resolveReport, dismissReport } from '@/modules/community/server';
import { requireModuleAdmin } from '@/modules/admin/server';
import {
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  adminActionsLimiter,
} from '@/shared/security/security';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await requireModuleAdmin(req, 'forum');
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`forum-report-handle:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action');
  const { id } = await context.params;

  try {
    if (action === 'resolve') {
      await resolveReport(admin.user.id, id);
    } else if (action === 'dismiss') {
      await dismissReport(admin.user.id, id);
    } else {
      return NextResponse.json({ error: '无效的操作（应为 resolve 或 dismiss）' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
