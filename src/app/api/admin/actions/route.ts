/**
 * @file 管理员操作日志 API — GET/DELETE /api/admin/actions（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies, toAdminAction } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 100);
  const adminId = url.searchParams.get('adminId') || undefined;
  const action = url.searchParams.get('action') || undefined;

  const params = new URLSearchParams({ limit: String(limit) });
  if (adminId) params.set('admin_id', adminId);
  if (action) params.set('action', action);

  const proxy = await proxyBackend(req, { path: `/audit/logs?${params.toString()}` });
  const body = (proxy.body ?? {}) as Record<string, unknown>;
  const items = (Array.isArray(body.items) ? body.items : []) as Array<Record<string, unknown>>;
  const res = NextResponse.json({ actions: items.map(toAdminAction) });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function DELETE(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as { before?: string };
  if (!body.before) {
    return NextResponse.json({ error: '缺少日期参数', code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  // 后端批量清理：DELETE /audit/logs?before=<iso>（query 参数）
  const proxy = await proxyBackend(req, {
    path: `/audit/logs?before=${encodeURIComponent(body.before)}`,
    method: 'DELETE',
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '删除失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const count = (proxy.body as { count?: number })?.count ?? 0;
  const res = NextResponse.json({ ok: true, count });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
