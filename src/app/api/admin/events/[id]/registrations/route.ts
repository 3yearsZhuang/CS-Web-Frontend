/**
 * @file 活动报名列表 API — GET /api/admin/events/[id]/registrations（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(req.url);
  const page = Number(url.searchParams.get('page')) || 1;
  const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 50, 100);

  const proxy = await proxyBackend(req, {
    path: `/admin/events/${encodeURIComponent(id)}/registrations?page=${page}&page_size=${pageSize}`,
  });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ registrations: [], total: 0 });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const body = (proxy.body ?? {}) as Record<string, unknown>;
  const items = (Array.isArray(body.items) ? body.items : []) as Array<Record<string, unknown>>;
  const res = NextResponse.json({
    registrations: items.map((r) => ({
      id: String(r.id),
      userId: r.user_id != null ? String(r.user_id) : null,
      displayName: r.display_name ?? null,
      email: r.email ?? null,
      status: r.status,
      formData: r.form_data ?? null,
      registeredAt: r.registered_at ?? '',
    })),
    total: Number(body.total ?? 0),
    page,
    pageSize,
    totalPages: Number(body.total_pages ?? 1),
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
