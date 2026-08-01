/**
 * @file 组件注册表 [id] API — PATCH 更新 / DELETE 删除
 *
 * 仅管理员可调用。
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/modules/admin/server';
import { updateComponent, deleteComponent } from '@/modules/tools/server';
import {
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  validateBody,
  adminActionsLimiter,
} from '@/shared/security/security';
import { z } from 'zod';

const updateSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z][a-z0-9-]*$/)
    .optional(),
  category: z.string().min(1).max(32).optional(),
  description: z.string().max(500).optional(),
  migrationStatus: z.enum(['legacy', 'migrating', 'done']).optional(),
});

export const runtime = 'nodejs';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const parsed = await validateBody(req, updateSchema);
  if (!parsed.ok) return parsed.response;

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

  try {
    const item = updateComponent(id, parsed.data);
    return NextResponse.json({ item });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  const rateKey = `admin-action:${ip}`;
  if (!adminActionsLimiter.check(rateKey)) {
    return jsonError('请求过于频繁，请稍后再试', 429);
  }

  try {
    deleteComponent(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
