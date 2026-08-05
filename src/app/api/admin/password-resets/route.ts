/**
 * @file 密码重置申请 API — GET/POST /api/admin/password-resets（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get('status') || undefined;

  const params = new URLSearchParams();
  if (status) params.set('status', status);
  const qs = params.toString();

  // 后端契约：GET /admin/password-resets 返回 ResetRequestOut 数组（非分页对象）
  const proxy = await proxyBackend(req, { path: `/admin/password-resets${qs ? `?${qs}` : ''}` });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ error: '未授权', code: 'UNAUTHORIZED' }, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const body = proxy.body;
  const items = (Array.isArray(body) ? body : []) as Array<Record<string, unknown>>;
  const requests = items.map((r) => ({
    // 后端 ResetRequestOut 经 TZModel camel_config() 输出 camelCase 字段
    id: String(r.id),
    email: r.email,
    status: r.status,
    requestedBy: null, // 后端无 requested_by 字段
    requestedAt: r.createdAt ?? '',
    handledBy: r.adminId != null ? String(r.adminId) : null,
    handledAt: r.resolvedAt ?? null,
  }));
  const res = NextResponse.json({
    requests,
    total: requests.length,
    page: 1,
    pageSize: requests.length,
    totalPages: Math.max(1, requests.length),
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as { email?: string };
  if (!body.email) {
    return NextResponse.json({ error: '缺少邮箱', code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const proxy = await proxyBackend(req, {
    path: '/admin/password-resets',
    method: 'POST',
    jsonBody: { email: body.email },
  });

  if (proxy.status !== 200 && proxy.status !== 201) {
    const err = normalizeError(proxy.body, '提交失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ ok: true });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
