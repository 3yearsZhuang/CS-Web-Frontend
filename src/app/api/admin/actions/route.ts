/**
 * @file 管理员操作日志列表 API
 */

import { NextResponse } from 'next/server';
import { requireRoot, listAdminActions, deleteAdminActionsBefore } from '@/modules/admin/server';
import {
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  parseJsonBody,
  adminActionsLimiter,
} from '@/shared/security/security';
import { deleteActionLogSchema } from '@/shared/security/schemas';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const admin = requireRoot(req);
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  const rateKey = `admin-action:${ip}`;
  if (!adminActionsLimiter.check(rateKey)) {
    const retryAfter = adminActionsLimiter.retryAfterSeconds(rateKey);
    return jsonError('请求过于频繁，请稍后再试', 429, {
      'Retry-After': String(retryAfter),
    });
  }

  const url = new URL(req.url);
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? Number(limitParam) : 50;
  if (!Number.isFinite(limit) || limit < 1) {
    return jsonError('limit 参数不合法', 400);
  }
  const adminId = url.searchParams.get('adminId') || undefined;
  const action = url.searchParams.get('action') || undefined;

  const actions = listAdminActions(adminId, limit, action);
  return NextResponse.json({ actions });
}

export async function DELETE(req: Request) {
  const admin = requireRoot(req);
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  const rateKey = `admin-action:${ip}`;
  if (!adminActionsLimiter.check(rateKey)) {
    const retryAfter = adminActionsLimiter.retryAfterSeconds(rateKey);
    return jsonError('请求过于频繁，请稍后再试', 429, {
      'Retry-After': String(retryAfter),
    });
  }

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = deleteActionLogSchema.safeParse(parsed.body);
  if (!result.success) {
    return jsonError(result.error.issues[0]?.message || '请求格式不正确', 400);
  }

  const { before } = result.data;

  try {
    const count = deleteAdminActionsBefore(admin.user.id, before);
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    return errorResponse(err);
  }
}