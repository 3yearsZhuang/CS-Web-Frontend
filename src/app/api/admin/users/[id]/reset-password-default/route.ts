/**
 * @file 管理员用户重置为默认密码 API
 */

import { NextResponse } from 'next/server';
import { requireAdmin, resetUserPasswordDefault } from '@/modules/admin/server';
import {
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  adminActionsLimiter,
} from '@/shared/security/security';

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
  const rateKey = `admin-action:${ip}`;
  if (!adminActionsLimiter.check(rateKey)) {
    const retryAfter = adminActionsLimiter.retryAfterSeconds(rateKey);
    return jsonError('请求过于频繁，请稍后再试', 429, {
      'Retry-After': String(retryAfter),
    });
  }

  const { id } = await params;
  try {
    await resetUserPasswordDefault(admin.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}