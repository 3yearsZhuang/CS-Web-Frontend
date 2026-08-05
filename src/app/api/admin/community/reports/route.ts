/**
 * @file 举报管理 API — GET/POST /api/admin/community/reports（BFF 薄转发）
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

  const proxy = await proxyBackend(req, { path: `/admin/community/reports?${params.toString()}` });
  const body = (proxy.body ?? {}) as Record<string, unknown>;
  const items = (Array.isArray(body.items) ? body.items : []) as Array<Record<string, unknown>>;
  const res = NextResponse.json({
    reports: items.map((r) => ({
      id: String(r.id),
      reporterId: r.reporter_id != null ? String(r.reporter_id) : null,
      targetType: r.target_type,
      targetId: String(r.target_id),
      reason: r.reason,
      detail: r.detail ?? null,
      status: r.status,
      handledBy: r.handled_by != null ? String(r.handled_by) : null,
      handledAt: r.handled_at ?? null,
      createdAt: r.created_at ?? '',
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

  const body = (await req.json().catch(() => ({}))) as {
    reportId?: string;
    action?: string;
  };
  if (!body.reportId || !body.action) {
    return NextResponse.json({ error: '参数不合法', code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const proxy = await proxyBackend(req, {
    path: `/admin/community/reports/${encodeURIComponent(body.reportId)}/${body.action}`,
    method: 'POST',
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '操作失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ ok: true });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
