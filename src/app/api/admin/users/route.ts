/**
 * @file 管理员用户列表 API
 */

import { NextResponse } from 'next/server';
import { listUsers, requireAdmin } from '@/modules/admin/server';
import {
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  adminActionsLimiter,
} from '@/shared/security/security';
import type { UserRole } from '@/shared/types';

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
  const search = url.searchParams.get('search') || undefined;

  const roleParam = url.searchParams.get('role') || 'all';
  let role: UserRole | 'all' = 'all';
  if (roleParam === 'user' || roleParam === 'admin') {
    role = roleParam;
  } else if (roleParam !== 'all') {
    return jsonError('role 参数不合法', 400);
  }

  const activeParam = url.searchParams.get('active') || 'all';
  let active: 'all' | 'active' | 'inactive' = 'all';
  if (activeParam === 'active' || activeParam === 'inactive') {
    active = activeParam;
  } else if (activeParam !== 'all') {
    return jsonError('active 参数不合法', 400);
  }

  const pageSize = Number(url.searchParams.get('pageSize')) || 50;
  const page = Number(url.searchParams.get('page')) || 1;

  const result = listUsers({ search, role, active, pageSize, page });
  return NextResponse.json(result);
}