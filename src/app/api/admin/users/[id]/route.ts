/**
 * @file 管理员用户详情 API
 */

import { NextResponse } from 'next/server';
import {
  requireAdmin,
  requireRoot,
  requirePasswordConfirmation,
  getUserById,
  updateUserByAdmin,
  deleteUserByAdmin,
} from '@/modules/admin/server';
import {
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  parseJsonBody,
  adminActionsLimiter,
} from '@/shared/security/security';
import { adminUpdateUserSchema } from '@/shared/security/schemas';
import { z } from 'zod';

const adminUpdateWithConfirmSchema = adminUpdateUserSchema.extend({
  password_confirmation: z.string().optional(),
});

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = requireAdmin(req);
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

  const { id } = await params;
  const user = getUserById(id);
  if (!user) {
    return NextResponse.json({ error: '用户不存在' }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = adminUpdateWithConfirmSchema.safeParse(parsed.body);
  if (!result.success) {
    return jsonError(result.error.issues[0]?.message || '请求格式不正确', 400);
  }
  const body = result.data;

  const confirm = requirePasswordConfirmation(req, body.password_confirmation ?? '');
  if (!confirm.ok) return confirm.response;

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

  const { id } = await params;
  try {
    const user = updateUserByAdmin(admin.user.id, id, {
      role: body.role,
      isActive: body.isActive,
      techTags: body.techTags,
    });
    return NextResponse.json({ user });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = await parseJsonBody<{ password_confirmation?: string }>(req);
  if (!parsed.ok) return parsed.response;
  const passwordConfirmation = parsed.body.password_confirmation ?? '';

  const confirm = requirePasswordConfirmation(req, passwordConfirmation);
  if (!confirm.ok) return confirm.response;

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

  const { id } = await params;
  try {
    deleteUserByAdmin(admin.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}