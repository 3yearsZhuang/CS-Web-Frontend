/**
 * @file 管理端活动详情 API — PUT/DELETE /api/admin/events/[id]（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies, toEventItem } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const { id } = await params;

  const proxy = await proxyBackend(req, {
    path: `/admin/events/${encodeURIComponent(id)}`,
    method: 'PUT',
    jsonBody: {
      title: body.title,
      month: body.month,
      date: body.date,
      description: body.description,
      status: body.status,
      year: body.year,
      topics: Array.isArray(body.topics) ? body.topics : undefined,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      is_pinned: body.isPinned,
      capacity: body.capacity,
      content_markdown: body.contentMarkdown,
      registration_fields: Array.isArray(body.registrationFields)
        ? body.registrationFields
        : undefined,
    },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '更新失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ event: toEventItem(proxy.body) });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const { id } = await params;
  const proxy = await proxyBackend(req, {
    path: `/admin/events/${encodeURIComponent(id)}`,
    method: 'DELETE',
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '删除失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ ok: true });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
