/**
 * @file 角色权限 API — GET/PUT /api/admin/roles/[key]/permissions（BFF 薄转发）
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

export async function GET(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  const proxy = await proxyBackend(req, { path: `/admin/roles/${encodeURIComponent(key)}/permissions` });

  const permissions = Array.isArray(proxy.body) ? proxy.body : [];
  const res = NextResponse.json({ permissions });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as { permissions?: string[] };
  const { key } = await params;

  const permissions = (Array.isArray(body.permissions) ? body.permissions : []).map(
    frontendKeyToBackendName,
  );

  const proxy = await proxyBackend(req, {
    path: `/admin/roles/${encodeURIComponent(key)}/permissions`,
    method: 'PUT',
    jsonBody: { permissions },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '保存失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  // 后端返回更新后的角色（含最新权限名），供面板就地刷新权限计数
  const res = NextResponse.json({ role: toAdminRole(proxy.body) });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
