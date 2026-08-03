/**
 * @file 角色列表/创建 API — GET/POST /api/admin/roles（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies, toAdminRole } from '@/shared/backend-client';
import { PERMISSION_MODULES } from '@/shared/security/permission-points';

export const runtime = 'nodejs';

const KNOWN_KEYS = new Set(PERMISSION_MODULES.flatMap((group) => group.permissions.map((p) => p.key)));

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/admin/roles' });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ roles: [] });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const list = (Array.isArray(proxy.body) ? proxy.body : []) as Array<Record<string, unknown>>;
  const roles = list.map((r) => toAdminRole(r, KNOWN_KEYS));
  const res = NextResponse.json({ roles });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as {
    key?: string;
    displayName?: string;
    description?: string;
    permissions?: string[];
  };
  if (!body.key) {
    return NextResponse.json({ error: '缺少角色标识', code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const proxy = await proxyBackend(req, {
    path: '/admin/roles',
    method: 'POST',
    jsonBody: {
      name: body.key,
      display_name: body.displayName ?? '',
      description: body.description ?? '',
      permissions: Array.isArray(body.permissions) ? body.permissions : [],
    },
  });

  if (proxy.status !== 200 && proxy.status !== 201) {
    const err = normalizeError(proxy.body, '创建失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ role: toAdminRole(proxy.body as Record<string, unknown>, KNOWN_KEYS) });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
