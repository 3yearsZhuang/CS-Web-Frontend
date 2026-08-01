/**
 * @file 管理员考试结束 API — POST /api/admin/tools/exam/:id/end
 *
 * 将已发布的考试手动结束
 *
 * 安全控制：
 *   - 必须管理员登录（requireAdmin 守卫）
 *   - Origin 白名单
 *   - 速率限制（adminActionsLimiter）
 */
import { NextResponse } from 'next/server';
import { endExam } from '@/modules/tools/server';
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
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = requireModuleAdmin(req, 'exam');
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`exam-end:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const { id } = await params;
  try {
    const exam = endExam(id);
    return NextResponse.json({ exam });
  } catch (err) {
    return errorResponse(err);
  }
}