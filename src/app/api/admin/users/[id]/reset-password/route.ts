/**
 * @file 管理员用户重置密码 API
 */

import { NextResponse } from 'next/server';
import { requireRoot, requirePasswordConfirmation, resetUserPasswordCustom } from '@/modules/admin/server';
import {
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  parseJsonBody,
  adminActionsLimiter,
} from '@/shared/security/security';
import { resetPasswordSchema } from '@/shared/security/schemas';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = resetPasswordSchema.safeParse(parsed.body);
  if (!result.success) {
    return jsonError(result.error.issues[0]?.message || '请求格式不正确', 400);
  }
  const { password, password_confirmation } = result.data;

  const confirm = await requirePasswordConfirmation(req, password_confirmation ?? '');
  if (!confirm.ok) return confirm.response;

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

  const { id } = await params;
  try {
    await resetUserPasswordCustom(admin.user.id, id, password);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}