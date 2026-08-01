/**
 * @file 管理员论坛分类列表 API
 */

import { NextResponse } from 'next/server';
import { listCategories, createCategory, type CategoryInput } from '@/modules/community/server';
import { requireModuleAdmin } from '@/modules/admin/server';
import {
  parseJsonBody,
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  adminActionsLimiter,
} from '@/shared/security/security';
import { createCategorySchema } from '@/shared/security/schemas';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const admin = requireModuleAdmin(req, 'forum');
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`forum-cat-list:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const categories = listCategories();
  return NextResponse.json({ items: categories });
}

export async function POST(req: Request) {
  const admin = requireModuleAdmin(req, 'forum');
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`forum-cat-create:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = createCategorySchema.safeParse(parsed.body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || '请求格式不正确' },
      { status: 400 },
    );
  }

  const input: CategoryInput = {
    slug: result.data.slug,
    name: result.data.name,
    description: result.data.description ?? null,
    icon: result.data.icon ?? null,
    sortOrder: result.data.sortOrder ?? 0,
  };

  try {
    const category = createCategory(admin.user.id, input);
    return NextResponse.json({ category }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}