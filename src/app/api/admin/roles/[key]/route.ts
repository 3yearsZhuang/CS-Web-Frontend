/**
 * @file 角色详情/更新/删除 API — /api/admin/roles/[key]（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import {
  clearAuthCookies,
  frontendKeyToBackendName,
  normalizeError,
  proxyBackend,
  setAuthCookies,
  toAdminRole,
} from '@/shared/backend-client';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ key: string }> };

export async function GET(req: Request, { params }: RouteContext) {
  const { key } = await params;
  const proxy = await proxyBackend(req, { path: `/admin/roles/${encodeURIComponent(key)}` });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ role: null }, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ role: toAdminRole(proxy.body) });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

/** PUT / PATCH 共用：更新角色元数据（后端同时支持两种方法） */
async function updateRole(req: Request, { params }: RouteContext, method: 'PUT' | 'PATCH') {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as {
    displayName?: string;
    fantasyDisplayName?: string;
    description?: string;
    permissions?: string[];
  };
  const { key } = await params;

  const proxy = await proxyBackend(req, {
    path: `/admin/roles/${encodeURIComponent(key)}`,
    method,
    jsonBody: {
      display_name: body.displayName,
      fantasy_display_name: body.fantasyDisplayName,
      description: body.description,
      permissions: Array.isArray(body.permissions)
        ? body.permissions.map(frontendKeyToBackendName)
        : undefined,
    },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '更新失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ role: toAdminRole(proxy.body) });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function PUT(req: Request, ctx: RouteContext) {
  return updateRole(req, ctx, 'PUT');
}

export async function PATCH(req: Request, ctx: RouteContext) {
  return updateRole(req, ctx, 'PATCH');
}

export async function DELETE(req: Request, { params }: RouteContext) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const { key } = await params;
  const proxy = await proxyBackend(req, {
    path: `/admin/roles/${encodeURIComponent(key)}`,
    method: 'DELETE',
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '删除失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ ok: true });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
