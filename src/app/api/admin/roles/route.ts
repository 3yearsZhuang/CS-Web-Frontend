/**
 * @file 管理员角色列表 API
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
import { listRoles, createRole } from '@/modules/admin/server';
import { z } from 'zod';

const createRoleSchema = z.object({
  key: z
    .string()
    .min(2, '角色 key 至少 2 个字符')
    .max(32, '角色 key 不超过 32 字符')
    .regex(/^[a-z][a-z0-9_]+$/, '角色 key 必须以字母开头，仅含小写字母/数字/下划线'),
  displayName: z.string().min(1, '角色名称不能为空').max(32, '角色名称不超过 32 字符'),
  description: z.string().max(200, '角色描述不超过 200 字符').optional(),
  permissions: z.array(z.string()).default([]),
});

export const runtime = 'nodejs';

export async function GET(req: Request) {
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

  const roles = listRoles();
  return NextResponse.json({ roles });
}

export async function POST(req: Request) {
  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = createRoleSchema.safeParse(parsed.body);
  if (!result.success) {
    return jsonError(result.error.issues[0]?.message || '请求格式不正确', 400);
  }

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

  try {
    const role = createRole(
      admin.user.id,
      result.data,
      { ip, userAgent: req.headers.get('user-agent') },
    );
    return NextResponse.json({ role }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}