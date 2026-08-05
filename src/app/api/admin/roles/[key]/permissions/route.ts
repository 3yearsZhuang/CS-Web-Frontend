/**
 * @file 角色权限 API — GET/PUT /api/admin/roles/[key]/permissions（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';
import { frontendKeyToBackendName } from '@/shared/backend-client';

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
  const res = NextResponse.json({ ok: true });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
