/**
 * @file 管理员考试发布 API — POST /api/admin/tools/exam/:id/publish
 *
 * 将草稿状态的考试发布为可答题状态
 *
 * 安全控制：
 *   - 必须管理员登录（requireAdmin 守卫）
 *   - Origin 白名单
 *   - 速率限制（adminActionsLimiter）
 */
import { NextResponse } from 'next/server';
import { publishExam } from '@/modules/tools/server';
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
  const admin = await requireModuleAdmin(req, 'exam');
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`exam-publish:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const { id } = await params;
  try {
    const exam = await publishExam(id);
    return NextResponse.json({ exam });
  } catch (err) {
    return errorResponse(err);
  }
}