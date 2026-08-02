/**
 * @file 管理员题目管理 API — GET/POST /api/admin/tools/exam/:id/questions
 *
 * GET: 获取考试的所有题目（含选项）
 * POST: 创建新题目（含选项）
 *
 * 安全控制：
 *   - 必须管理员登录（requireAdmin 守卫）
 *   - Origin 白名单
 *   - JSON Content-Type（POST）
 *   - 速率限制（adminActionsLimiter）
 */
import { NextResponse } from 'next/server';
import { listQuestionsByExam, createQuestion, type QuestionInput } from '@/modules/tools/server';
import { requireModuleAdmin } from '@/modules/admin/server';
import {
  parseJsonBody,
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  adminActionsLimiter,
} from '@/shared/security/security';
import { addQuestionSchema } from '@/shared/security/schemas';

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
  if (!adminActionsLimiter.check(`exam-questions-list:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const { id } = await params;
  const questions = await listQuestionsByExam(id);
  return NextResponse.json({ questions });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireModuleAdmin(req, 'exam');
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`exam-questions-create:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const { id } = await params;
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = addQuestionSchema.safeParse(parsed.body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || '请求格式不正确' },
      { status: 400 },
    );
  }

  const input: QuestionInput = {
    type: result.data.type,
    title: result.data.title,
    contentMarkdown: result.data.contentMarkdown ?? undefined,
    score: result.data.score,
    sortOrder: result.data.sortOrder,
    options: result.data.options,
  };

  try {
    const question = await createQuestion(id, input);
    return NextResponse.json({ question }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}