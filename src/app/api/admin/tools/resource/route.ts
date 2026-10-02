/**
 * @file 管理端资源审核 API — GET/PATCH/POST /api/admin/tools/resource（BFF 薄转发）
 *
 * TOOLS-GOV Slice C：GET 落到后端 /tools/admin/resources（复数；后端分页参数为
 * skip/limit，此处由 page/pageSize 折算）；审核按消费方 tool-resource-review 的
 * PATCH ?id= 约定（status: published→approve / hidden→reject，note→reason）分发到
 * /tools/admin/resources/{id}/approve|reject（原 POST /tools/admin/resource 不存在）。
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

  const params = new URLSearchParams({
    skip: String((page - 1) * pageSize),
    limit: String(pageSize),
  });
  if (status) params.set('status', status);

  const proxy = await proxyBackend(req, { path: `/tools/admin/resources?${params.toString()}` });
  const body = (proxy.body ?? {}) as Record<string, unknown>;
  const items = (Array.isArray(body.items) ? body.items : []) as Array<Record<string, unknown>>;
  const res = NextResponse.json({
    resources: items.map((r) => ({
      id: String(r.id),
      title: r.title,
      description: r.description ?? null,
      url: r.url,
      resourceType: r.resource_type,
      techTags: Array.isArray(r.tech_tags) ? r.tech_tags : [],
      status: r.status,
      submittedBy: r.submitted_by != null ? String(r.submitted_by) : null,
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

export async function PATCH(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const url = new URL(req.url);
  const resourceId = url.searchParams.get('id');
  const body = (await req.json().catch(() => ({}))) as { status?: string; note?: string };
  if (!resourceId || !body.status) {
    return NextResponse.json({ error: '参数不合法', code: 'VALIDATION_FAILED' }, { status: 400 });
  }
  const approved = body.status === 'published';
  if (!approved && body.status !== 'hidden') {
    return NextResponse.json({ error: '未知操作', code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const reason = body.note?.trim() || null;
  const query = !approved && reason ? `?reason=${encodeURIComponent(reason)}` : '';
  const proxy = await proxyBackend(req, {
    path: `/tools/admin/resources/${encodeURIComponent(resourceId)}/${
      approved ? 'approve' : 'reject'
    }${query}`,
    method: 'POST',
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '操作失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ ok: true, resource: proxy.body });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as {
    resourceId?: string;
    action?: string;
    reviewNote?: string;
  };
  if (!body.resourceId || !body.action) {
    return NextResponse.json({ error: '参数不合法', code: 'VALIDATION_FAILED' }, { status: 400 });
  }
  if (body.action !== 'approve' && body.action !== 'reject') {
    return NextResponse.json({ error: '未知操作', code: 'VALIDATION_FAILED' }, { status: 400 });
  }

  const reason = (body.reviewNote as string | undefined) ?? null;
  const query = body.action === 'reject' && reason ? `?reason=${encodeURIComponent(reason)}` : '';
  const proxy = await proxyBackend(req, {
    path: `/tools/admin/resources/${encodeURIComponent(body.resourceId)}/${body.action}${query}`,
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
