/**
 * @file 管理员论坛分类详情 API
 */

import { NextResponse } from 'next/server';
import { updateCategory, deleteCategory, type CategoryInput } from '@/modules/community/server';
import { requireModuleAdmin } from '@/modules/admin/server';
import {
  parseJsonBody,
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  adminActionsLimiter,
} from '@/shared/security/security';
import { updateCategorySchema } from '@/shared/security/schemas';

export const runtime = 'nodejs';

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await requireModuleAdmin(req, 'forum');
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`forum-cat-put:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = updateCategorySchema.safeParse(parsed.body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || '请求格式不正确' },
      { status: 400 },
    );
  }

  const input: Partial<CategoryInput> = result.data;

  const { id } = await context.params;
  try {
    const category = await updateCategory(id, input, admin.user.id);
    return NextResponse.json({ category });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await requireModuleAdmin(req, 'forum');
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`forum-cat-delete:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const { id } = await context.params;
  try {
    await deleteCategory(admin.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}