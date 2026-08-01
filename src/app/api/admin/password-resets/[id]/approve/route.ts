/**
 * @file 管理员密码重置审批 API
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/modules/admin/server';
import { approveResetRequest } from '@/modules/auth/server';
import {
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  parseJsonBody,
  adminActionsLimiter,
} from '@/shared/security/security';
import { approveRejectResetSchema } from '@/shared/security/schemas';

export const runtime = 'nodejs';

export async function POST(
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

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = approveRejectResetSchema.safeParse(parsed.body);
  const note = result.success ? result.data.note : undefined;

  const { id } = await params;
  try {
    const user = approveResetRequest(admin.user.id, id, note);
    return NextResponse.json({
      user,
      message: '密码已重置为默认密码',
    });
  } catch (err) {
    return errorResponse(err);
  }
}