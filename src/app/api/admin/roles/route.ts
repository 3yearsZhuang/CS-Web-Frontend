/**
 * @file 角色列表/创建 API — GET/POST /api/admin/roles（BFF 薄转发）
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

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/admin/roles' });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ roles: [] }, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const list = (Array.isArray(proxy.body) ? proxy.body : []) as Array<Record<string, unknown>>;
  const roles = list.map((r) => toAdminRole(r));
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
    fantasyDisplayName?: string;
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
      fantasy_display_name: body.fantasyDisplayName || null,
      description: body.description ?? '',
      // 前端权限 key（module.resource.action）→ 后端权限名（resource:action）
      permissions: Array.isArray(body.permissions)
        ? body.permissions.map(frontendKeyToBackendName)
        : [],
    },
  });

  if (proxy.status !== 200 && proxy.status !== 201) {
    const err = normalizeError(proxy.body, '创建失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ role: toAdminRole(proxy.body) });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
