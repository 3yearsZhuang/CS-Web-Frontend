/**
 * @file 管理员考试管理 API — GET/POST /api/admin/tools/exam
 *
 * GET: 列出所有考试（分页，支持状态过滤）
 * POST: 创建新考试（draft 状态）
 *
 * 安全控制：
 *   - 必须管理员登录（requireAdmin 守卫）
 *   - Origin 白名单
 *   - JSON Content-Type（POST）
 *   - 速率限制（adminActionsLimiter）
 */
import { NextResponse } from 'next/server';
import { listExams, createExam, type ExamInput } from '@/modules/tools/server';
import { requireModuleAdmin } from '@/modules/admin/server';
import {
  parseJsonBody,
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  adminActionsLimiter,
} from '@/shared/security/security';
import { createExamSchema } from '@/shared/security/schemas';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const admin = requireModuleAdmin(req, 'exam');
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`exam-list:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const url = new URL(req.url);
  const status = url.searchParams.get('status') as 'draft' | 'published' | 'ended' | null;
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);

  try {
    const result = listExams({
      status: status === 'draft' || status === 'published' || status === 'ended' ? status : undefined,
      page: Number.isFinite(page) ? page : 1,
      pageSize: Number.isFinite(pageSize) ? pageSize : 20,
    });
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  const admin = requireModuleAdmin(req, 'exam');
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`exam-create:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = createExamSchema.safeParse(parsed.body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || '请求格式不正确' },
      { status: 400 },
    );
  }

  const data = result.data;
  const input: ExamInput = {
    title: data.title,
    description: data.description ?? undefined,
    startTime: data.startTime,
    endTime: data.endTime,
    durationMinutes: data.durationMinutes,
    techTags: data.techTags ?? undefined,
  };

  try {
    const exam = createExam(admin.user.id, input);
    return NextResponse.json({ exam }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}