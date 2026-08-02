/**
 * @file 管理员角色详情 API
 */

import { NextResponse } from 'next/server';
import { requireRoot } from '@/modules/admin/server';
import {
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  parseJsonBody,
  adminActionsLimiter,
} from '@/shared/security/security';
import { getRole, updateRole, deleteRole } from '@/modules/admin/server';
import { z } from 'zod';

const updateRoleSchema = z.object({
  displayName: z.string().min(1, '角色名称不能为空').max(32, '角色名称不超过 32 字符').optional(),
  description: z.string().max(200, '角色描述不超过 200 字符').optional(),
});

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const admin = await requireRoot(req);
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

  const { key } = await params;
  try {
    const role = getRole(key);
    return NextResponse.json({ role });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = updateRoleSchema.safeParse(parsed.body);
  if (!result.success) {
    return jsonError(result.error.issues[0]?.message || '请求格式不正确', 400);
  }

  const admin = await requireRoot(req);
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

  const { key } = await params;
  try {
    const role = await updateRole(
      admin.user.id,
      key,
      result.data,
      { ip, userAgent: req.headers.get('user-agent') },
    );
    return NextResponse.json({ role });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const admin = await requireRoot(req);
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

  const { key } = await params;
  try {
    await deleteRole(admin.user.id, key, {
      ip,
      userAgent: req.headers.get('user-agent'),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}