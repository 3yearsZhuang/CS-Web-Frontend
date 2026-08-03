/**
 * @file 角色详情/更新/删除 API — /api/admin/roles/[key]（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies, toAdminRole } from '@/shared/backend-client';
import { PERMISSION_MODULES } from '@/shared/security/permission-points';

export const runtime = 'nodejs';

const KNOWN_KEYS = new Set(PERMISSION_MODULES.flatMap((group) => group.permissions.map((p) => p.key)));

export async function GET(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  const proxy = await proxyBackend(req, { path: `/admin/roles/${encodeURIComponent(key)}` });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ role: null });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ role: toAdminRole(proxy.body as Record<string, unknown>, KNOWN_KEYS) });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as {
    displayName?: string;
    description?: string;
    permissions?: string[];
  };
  const { key } = await params;

  const proxy = await proxyBackend(req, {
    path: `/admin/roles/${encodeURIComponent(key)}`,
    method: 'PUT',
    jsonBody: {
      display_name: body.displayName,
      description: body.description,
      permissions: Array.isArray(body.permissions) ? body.permissions : undefined,
    },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '更新失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ role: toAdminRole(proxy.body as Record<string, unknown>, KNOWN_KEYS) });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ key: string }> },
) {
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
