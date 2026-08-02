/**
 * @file 管理员考试管理 API — GET/PUT/DELETE /api/admin/tools/exam/:id
 *
 * GET: 获取考试详情
 * PUT: 更新考试（仅 draft 状态可编辑）
 * DELETE: 删除考试（级联删除题目、选项、答题记录）
 *
 * 安全控制：
 *   - 必须管理员登录（requireAdmin 守卫）
 *   - Origin 白名单
 *   - JSON Content-Type（PUT）
 *   - 速率限制（adminActionsLimiter）
 */
import { NextResponse } from 'next/server';
import { getExamById, updateExam, deleteExam, type ExamInput } from '@/modules/tools/server';
import { requireModuleAdmin } from '@/modules/admin/server';
import {
  parseJsonBody,
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  adminActionsLimiter,
} from '@/shared/security/security';
import { updateExamSchema } from '@/shared/security/schemas';

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
  if (!adminActionsLimiter.check(`exam-get:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const { id } = await params;
  const exam = getExamById(id);
  if (!exam) {
    return NextResponse.json({ error: '考试不存在' }, { status: 404 });
  }
  return NextResponse.json({ exam });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireModuleAdmin(req, 'exam');
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`exam-put:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const { id } = await params;
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = updateExamSchema.safeParse(parsed.body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || '请求格式不正确' },
      { status: 400 },
    );
  }

  const input: Partial<ExamInput> = result.data;

  try {
    const exam = updateExam(id, input);
    return NextResponse.json({ exam });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireModuleAdmin(req, 'exam');
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`exam-delete:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const { id } = await params;
  try {
    deleteExam(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}