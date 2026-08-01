/**
 * @file 管理员密码重置列表 API
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/modules/admin/server';
import {
  listResetRequests,
  type ResetRequestStatus,
} from '@/modules/auth/server';
import {
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  adminActionsLimiter,
} from '@/shared/security/security';

export const runtime = 'nodejs';

export async function GET(req: Request) {
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

  const url = new URL(req.url);
  const statusParam = url.searchParams.get('status') || 'pending';
  const validStatuses: ResetRequestStatus[] = ['pending', 'approved', 'rejected'];
  const status = validStatuses.includes(statusParam as ResetRequestStatus)
    ? (statusParam as ResetRequestStatus)
    : 'pending';

  const requests = listResetRequests(status);
  return NextResponse.json({ requests });
}