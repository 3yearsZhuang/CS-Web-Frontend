/**
 * @file 功能模块可见性 — 管理员更新 BFF（root 专属）
 *
 * PUT /api/admin/feature-visibility/[moduleKey]
 *   → 透传后端 PUT /api/v1/admin/feature-visibility/{moduleKey}
 *   → requireRoot 双闸门 + Origin 白名单；body 含 totpCode（2FA 强校验在后端）
 */

import { NextResponse } from 'next/server';
import { requireRoot } from '@/shared/security/guards';
import {
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  adminActionsLimiter,
} from '@/shared/security/security';
import {
  clearAuthCookies,
  normalizeError,
  proxyBackend,
  setAuthCookies,
} from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ moduleKey: string }> },
) {
  const root = await requireRoot(req);
  if (!root.ok) return root.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`feature-visibility-write:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const { moduleKey } = await params;

  const body = (await req.json().catch(() => null)) as {
    guest?: boolean;
    member?: boolean;
    admin?: boolean;
    totpCode?: string;
  } | null;

  if (
    !body ||
    typeof body.guest !== 'boolean' ||
    typeof body.member !== 'boolean' ||
    typeof body.admin !== 'boolean' ||
    typeof body.totpCode !== 'string' ||
    !/^\d{6}$/.test(body.totpCode)
  ) {
    return jsonError('请求参数不合法', 400);
  }

  const proxy = await proxyBackend(req, {
    path: `/admin/feature-visibility/${encodeURIComponent(moduleKey)}`,
    method: 'PUT',
    jsonBody: {
      guest: body.guest,
      member: body.member,
      admin: body.admin,
      totpCode: body.totpCode,
    },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '更新失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }

  const res = NextResponse.json(proxy.body);
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
