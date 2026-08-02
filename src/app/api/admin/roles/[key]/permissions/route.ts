/**
 * @file 管理员角色权限管理 API
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
import { updateRolePermissions } from '@/modules/admin/server';
import { z } from 'zod';

const updatePermissionsSchema = z.object({
  permissions: z.array(z.string()),
});

export const runtime = 'nodejs';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = updatePermissionsSchema.safeParse(parsed.body);
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
    const role = await updateRolePermissions(
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