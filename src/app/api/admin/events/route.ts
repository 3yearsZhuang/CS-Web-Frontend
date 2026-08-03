/**
 * @file 管理端活动 API — GET/POST /api/admin/events（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies, toEventItem } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const month = url.searchParams.get('month') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const search = url.searchParams.get('search') || undefined;
  const page = Number(url.searchParams.get('page')) || 1;
  const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 20, 50);

  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  if (month) params.set('month', month);
  if (status) params.set('status', status);
  if (search) params.set('search', search);

  const proxy = await proxyBackend(req, { path: `/admin/events?${params.toString()}` });
  const body = (proxy.body ?? {}) as Record<string, unknown>;
  const items = (Array.isArray(body.items) ? body.items : []) as Array<Record<string, unknown>>;
  const res = NextResponse.json({
    events: items.map(toEventItem),
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
    path: '/admin/events',
    method: 'POST',
    jsonBody: {
      title: body.title,
      month: body.month ?? null,
      date: body.date ?? null,
      description: body.description ?? null,
      status: body.status ?? 'upcoming',
      year: body.year ?? null,
      topics: Array.isArray(body.topics) ? body.topics : [],
      tags: Array.isArray(body.tags) ? body.tags : [],
      is_pinned: body.isPinned ?? false,
      capacity: body.capacity ?? 0,
      content_markdown: body.contentMarkdown ?? null,
      registration_fields: body.registrationFields ?? [],
    },
  });

  if (proxy.status !== 200 && proxy.status !== 201) {
    const err = normalizeError(proxy.body, '创建失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ event: toEventItem(proxy.body) }, { status: 201 });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
