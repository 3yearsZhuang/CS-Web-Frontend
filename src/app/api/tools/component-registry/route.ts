/**
 * @file 组件注册表 API — GET 列表 / POST 创建
 *
 * GET：公开访问，返回全量组件列表（含变体与规范）
 * POST：仅管理员，创建新组件条目
 */
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/modules/admin/server';
import { listComponents, createComponent } from '@/modules/tools/server';
import {
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  validateBody,
  adminActionsLimiter,
} from '@/shared/security/security';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1, '组件名称不能为空').max(64, '组件名称不超过 64 字符'),
  slug: z
    .string()
    .min(2, 'slug 至少 2 字符')
    .max(64, 'slug 不超过 64 字符')
    .regex(/^[a-z][a-z0-9-]*$/, 'slug 必须以小写字母开头，仅含小写字母/数字/连字符'),
  category: z.string().min(1, '分类不能为空').max(32, '分类不超过 32 字符'),
  description: z.string().max(500, '描述不超过 500 字符').default(''),
  migrationStatus: z.enum(['legacy', 'migrating', 'done']).optional(),
});

export const runtime = 'nodejs';

export async function GET() {
  const components = await listComponents();
  return NextResponse.json({ components });
}

export async function POST(req: Request) {
  const parsed = await validateBody(req, createSchema);
  if (!parsed.ok) return parsed.response;

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

  try {
    const item = await createComponent(parsed.data);
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
