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
  const page = Number(url.searchParams.get('page')) || 1;
  const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 20, 50);

  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (status) params.set('status', status);

  const proxy = await proxyBackend(req, { path: `/admin/password-resets?${params.toString()}` });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ error: '未授权', code: 'UNAUTHORIZED' }, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const body = (proxy.body ?? {}) as Record<string, unknown>;
  const items = (Array.isArray(body.items) ? body.items : []) as Array<Record<string, unknown>>;
  const res = NextResponse.json({
    requests: items.map((r) => ({
      id: String(r.id),
      email: r.email,
      status: r.status,
      requestedBy: r.requested_by != null ? String(r.requested_by) : null,
      requestedAt: r.created_at ?? '',
      handledBy: r.handled_by != null ? String(r.handled_by) : null,
      handledAt: r.handled_at ?? null,
    })),
    total: Number(body.total ?? 0),
    page,
    pageSize,
    totalPages: Number(body.total_pages ?? 1),
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
