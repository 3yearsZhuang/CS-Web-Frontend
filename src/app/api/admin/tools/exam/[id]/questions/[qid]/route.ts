/**
 * @file 管理员题目管理 API — PUT/DELETE /api/admin/tools/exam/:id/questions/:qid
 *
 * PUT: 更新题目（含选项全量替换）
 * DELETE: 删除题目
 *
 * 安全控制：
 *   - 必须管理员登录（requireAdmin 守卫）
 *   - Origin 白名单
 *   - JSON Content-Type（PUT）
 *   - 速率限制（adminActionsLimiter）
 */
import { NextResponse } from 'next/server';
import { updateQuestion, deleteQuestion, type QuestionInput } from '@/modules/tools/server';
import { requireModuleAdmin } from '@/modules/admin/server';
import {
  parseJsonBody,
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  adminActionsLimiter,
} from '@/shared/security/security';
import { updateQuestionSchema } from '@/shared/security/schemas';

export const runtime = 'nodejs';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; qid: string }> },
) {
  const admin = requireModuleAdmin(req, 'exam');
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`exam-question-put:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const { qid } = await params;
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = updateQuestionSchema.safeParse(parsed.body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || '请求格式不正确' },
      { status: 400 },
    );
  }

  const input: Partial<QuestionInput> = result.data;

  try {
    const question = updateQuestion(qid, input);
    return NextResponse.json({ question });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; qid: string }> },
) {
  const admin = requireModuleAdmin(req, 'exam');
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`exam-question-delete:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const { qid } = await params;
  try {
    deleteQuestion(qid);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}