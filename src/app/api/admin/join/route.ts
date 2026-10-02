/**
 * @file 入社申请管理 API — GET/POST /api/join/admin（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies, toJoinApplication } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const status = url.searchParams.get('status') || undefined;
  const page = Number(url.searchParams.get('page')) || 1;
  const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 20, 50);

  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (status) params.set('status', status);

  const proxy = await proxyBackend(req, { path: `/join/admin?${params.toString()}` });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ applications: [], total: 0 });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  // P1-8 修复：后端 /join/admin 返回裸数组（list[JoinApplicationOut]，camelCase），
  // 此前按分页对象 {items,total,total_pages} 解构导致 applications 恒空。
  const raw = proxy.body as unknown;
  const items = (
    Array.isArray(raw) ? raw : ((raw as Record<string, unknown> | null)?.items ?? [])
  ) as Array<Record<string, unknown>>;
  const res = NextResponse.json({
    applications: items.map(toJoinApplication),
    total: items.length,
    page,
    pageSize,
    totalPages: 1,
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as {
    applicationId?: string;
    decision?: string;
    note?: string;
  };
  if (!body.applicationId || !body.decision) {
    return NextResponse.json({ error: '参数不合法', code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const proxy = await proxyBackend(req, {
    path: `/join/admin/${encodeURIComponent(body.applicationId)}`,
    method: 'PATCH',
    jsonBody: { decision: body.decision, note: body.note ?? null },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '处理失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ ok: true });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
