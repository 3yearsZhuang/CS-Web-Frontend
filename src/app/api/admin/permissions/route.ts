/**
 * @file 管理员权限列表 API
 */

import { NextResponse } from 'next/server';
import { requireRoot } from '@/modules/admin/server';
import {
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  adminActionsLimiter,
} from '@/shared/security/security';
import { PERMISSION_MODULES } from '@/shared/security/permissions';

export const runtime = 'nodejs';

export async function GET(req: Request) {
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

  return NextResponse.json({ modules: PERMISSION_MODULES });
}