/**
 * @file 管理员资源审核 API — GET/PATCH /api/admin/tools/resource
 *
 * GET: 列出待审核资源（分页）
 * PATCH: 审核资源（通过/拒绝）
 */
import { NextResponse } from 'next/server';
import { listPendingResources, reviewResource, type ReviewResourceInput } from '@/modules/tools/server';
import { requireAdmin } from '@/modules/admin/server';
import {
  parseJsonBody,
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  adminActionsLimiter,
} from '@/shared/security/security';
import { reviewResourceSchema } from '@/shared/security/schemas';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`resource-review-list:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1', 10);
  const pageSize = parseInt(url.searchParams.get('pageSize') || '20', 10);

  try {
    const result = listPendingResources(
      Number.isFinite(page) ? page : 1,
      Number.isFinite(pageSize) ? pageSize : 20,
    );
    return NextResponse.json(result);
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
  if (!adminActionsLimiter.check(`resource-review:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = reviewResourceSchema.safeParse(parsed.body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || '请求格式不正确' },
      { status: 400 },
    );
  }

  const data = result.data;
  const requestUrl = new URL(req.url);
  const resourceId = requestUrl.searchParams.get('id');

  if (!resourceId) {
    return NextResponse.json({ error: '缺少资源 ID' }, { status: 400 });
  }

  const input: ReviewResourceInput = {
    status: data.status,
    note: data.note ?? undefined,
  };

  try {
    const reviewResult = await reviewResource(resourceId, admin.user.id, input, ip, undefined);
    if (!reviewResult.ok) {
      return NextResponse.json({ error: reviewResult.error }, { status: 400 });
    }
    return NextResponse.json({ resource: reviewResult.resource });
  } catch (err) {
    return errorResponse(err);
  }
}