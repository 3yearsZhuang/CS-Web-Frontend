/**
 * @file 管理员用户启用 API
 */

import { NextResponse } from 'next/server';
import { requireAdmin, setUserActiveByAdmin } from '@/modules/admin/server';
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
    const user = await setUserActiveByAdmin(admin.user.id, id, true);
    return NextResponse.json({ user });
  } catch (err) {
    return errorResponse(err);
  }
}