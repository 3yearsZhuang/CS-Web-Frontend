/**
 * @file 用户角色绑定 API — GET/PUT /api/admin/users/[id]/role-bindings（BFF 薄转发）
 *
 * 后端以 If-Match 授权版本做乐观锁；请求体使用后端 snake_case DTO。
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import {
  clearAuthCookies,
  normalizeError,
  proxyBackend,
  setAuthCookies,
} from '@/shared/backend-client';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: Ctx) {
  const { id } = await params;
  const proxy = await proxyBackend(req, {
    path: `/admin/users/${encodeURIComponent(id)}/role-bindings`,
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '读取角色绑定失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }

  const body = proxy.body as {
    userId?: number;
    authorizationVersion?: number;
    bindings?: unknown[];
  };
  const res = NextResponse.json({
    userId: body.userId,
    authorizationVersion: body.authorizationVersion ?? 1,
    bindings: body.bindings ?? [],
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function PUT(req: Request, { params }: Ctx) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const { id } = await params;
  const payload = (await req.json().catch(() => ({}))) as {
    version?: number;
    bindings?: Array<{ roleId?: number; scopeType?: string; scopePeakId?: number | null }>;
  };

  const headers: Record<string, string> = {};
  if (typeof payload.version === 'number') {
    headers['If-Match'] = `"${payload.version}"`;
  }

  const bindings = (payload.bindings ?? [])
    .map((item) => ({
      role_id: Number(item.roleId),
      scope_type: item.scopeType === 'peak' || item.scopeType === 'all' ? item.scopeType : 'own',
      scope_peak_id: item.scopePeakId ? Number(item.scopePeakId) : null,
    }))
    .filter((item) => Number.isInteger(item.role_id) && item.role_id > 0);

  const proxy = await proxyBackend(req, {
    path: `/admin/users/${encodeURIComponent(id)}/role-bindings`,
    method: 'PUT',
    jsonBody: { bindings },
    headers,
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '保存角色绑定失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }

  const body = proxy.body as {
    userId?: number;
    authorizationVersion?: number;
    bindings?: unknown[];
  };
  const res = NextResponse.json({
    userId: body.userId,
    authorizationVersion: body.authorizationVersion ?? 1,
    bindings: body.bindings ?? [],
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
