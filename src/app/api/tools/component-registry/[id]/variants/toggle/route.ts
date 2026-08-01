/**
 * @file 组件注册表变体切换 API — POST toggle
 *
 * 切换指定变体的启用/禁用状态。仅管理员可调用。
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/modules/admin/server';
import { toggleVariant } from '@/modules/tools/server';
import {
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  validateBody,
  adminActionsLimiter,
} from '@/shared/security/security';
import { z } from 'zod';

const toggleSchema = z.object({
  variantId: z.string().min(1, 'variantId 不能为空'),
  enabled: z.boolean(),
});

export const runtime = 'nodejs';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const parsed = await validateBody(req, toggleSchema);
  if (!parsed.ok) return parsed.response;

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
    toggleVariant(id, parsed.data.variantId, parsed.data.enabled);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
