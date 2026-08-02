/**
 * @file 管理员考试排名 API — GET /api/admin/tools/exam/:id/ranking
 *
 * 获取考试排名
 *
 * 安全控制：
 *   - 必须管理员登录（requireAdmin 守卫）
 *   - Origin 白名单
 *   - 速率限制（adminActionsLimiter）
 */
import { NextResponse } from 'next/server';
import { getExamRanking } from '@/modules/tools/server';
import { requireModuleAdmin } from '@/modules/admin/server';
import {
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  adminActionsLimiter,
} from '@/shared/security/security';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireModuleAdmin(req, 'exam');
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`exam-ranking:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const { id } = await params;
  try {
    const ranking = await getExamRanking(id);
    return NextResponse.json({ ranking });
  } catch (err) {
    return errorResponse(err);
  }
}