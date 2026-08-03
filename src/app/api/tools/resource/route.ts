/**
 * @file 资源列表/提交 API — GET/POST /api/tools/resource（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const category = url.searchParams.get('category') || undefined;
  const tag = url.searchParams.get('tag') || undefined;
  const page = Number(url.searchParams.get('page')) || 1;
  const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 20, 50);

  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (category) params.set('category', category);
  if (tag) params.set('tag', tag);

  const proxy = await proxyBackend(req, { path: `/tools/resource?${params.toString()}` });
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
      viewCount: r.view_count ?? 0,
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

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const proxy = await proxyBackend(req, {
    path: '/tools/resource',
    method: 'POST',
    jsonBody: {
      title: body.title,
      description: body.description ?? null,
      url: body.url,
      resource_type: body.resourceType,
      tech_tags: Array.isArray(body.techTags) ? body.techTags : [],
    },
  });

  if (proxy.status !== 200 && proxy.status !== 201) {
    const err = normalizeError(proxy.body, '提交失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ resource: proxy.body }, { status: 201 });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
