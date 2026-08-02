/**
 * @file 管理员活动报名管理 API
 */

import { NextResponse } from 'next/server';
import { adminAddRegistration, adminUpdateRegistrationStatus } from '@/modules/events/server';
import { requireAdmin } from '@/modules/admin/server';
import {
  parseJsonBody,
  assertAllowedOrigin,
  jsonError,
  errorResponse,
  adminActionsLimiter,
  getClientIp,
} from '@/shared/security/security';
import { manageRegistrationSchema, updateRegistrationSchema } from '@/shared/security/schemas';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`registrations-manage:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const { id: eventId } = await params;
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = manageRegistrationSchema.safeParse(parsed.body);
  if (!result.success) {
    return jsonError(result.error.issues[0]?.message || '请求格式不正确', 400);
  }

  const body = parsed.body as { formData?: Record<string, string> };
  try {
    const res = await adminAddRegistration(admin.user.id, result.data.userId, eventId, body.formData);
    return NextResponse.json({ ok: true, registration: res.registration }, { status: 201 });
  } catch (err) {
    return errorResponse(err, {
      NOT_FOUND: '活动不存在',
      ALREADY_REGISTERED: '该用户已报名此活动',
      FULL: '活动名额已满',
    });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`registrations-manage:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = updateRegistrationSchema.safeParse(parsed.body);
  if (!result.success) {
    return jsonError(result.error.issues[0]?.message || '请求格式不正确', 400);
  }

  try {
    await adminUpdateRegistrationStatus(admin.user.id, result.data.registrationId, result.data.status);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err, {
      NOT_FOUND: '报名记录不存在',
    });
  }
}