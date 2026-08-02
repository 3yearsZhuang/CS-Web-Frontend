/**
 * @file 管理员入社申请审批 API — GET/PATCH /api/admin/join
 *
 * GET: 列出入社申请（支持按状态筛选）
 * PATCH: 审批入社申请（通过/拒绝）
 */
import { NextResponse } from 'next/server';
import { listJoinApplications, reviewJoinApplication, type JoinApplicationStatus } from '@/modules/join/server';
import { requireAdmin } from '@/modules/admin/server';
import {
  parseJsonBody,
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  adminActionsLimiter,
} from '@/shared/security/security';
import { z } from 'zod';

export const runtime = 'nodejs';

const reviewSchema = z.object({
  applicationId: z.string().min(1, '申请 ID 不能为空'),
  status: z.enum(['approved', 'rejected']),
  reviewNote: z.string().max(200).optional(),
});

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`join-app-list:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const url = new URL(req.url);
  const status = url.searchParams.get('status') as JoinApplicationStatus | null;

  try {
    const applications = await listJoinApplications(status || undefined);
    return NextResponse.json({ applications });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`join-app-review:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = reviewSchema.safeParse(parsed.body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || '请求格式不正确' },
      { status: 400 },
    );
  }

  try {
    const application = await reviewJoinApplication(
      admin.user.id,
      result.data.applicationId,
      result.data.status,
      result.data.reviewNote,
    );
    return NextResponse.json({ application });
  } catch (err) {
    return errorResponse(err);
  }
}