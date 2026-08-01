/**
 * @file 组件注册表使用规范 API — PUT update guide
 *
 * 更新指定组件的适用场景与反模式。仅管理员可调用。
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/modules/admin/server';
import { updateGuide } from '@/modules/tools/server';
import {
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  validateBody,
  adminActionsLimiter,
} from '@/shared/security/security';
import { z } from 'zod';

const guideSchema = z.object({
  useCases: z.array(z.string()).default([]),
  antiPatterns: z.array(z.string()).default([]),
});

export const runtime = 'nodejs';

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const parsed = await validateBody(req, guideSchema);
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
    const guide = updateGuide(id, parsed.data);
    return NextResponse.json({ guide });
  } catch (err) {
    return errorResponse(err);
  }
}
