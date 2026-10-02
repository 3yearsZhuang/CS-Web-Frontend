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
  // P1-8 修复：后端返回裸数组（list[EventRegistrationOut]，camelCase），此前按分页对象解构恒空。
  const raw = proxy.body as unknown;
  const items = (
    Array.isArray(raw) ? raw : ((raw as Record<string, unknown> | null)?.items ?? [])
  ) as Array<Record<string, unknown>>;
  const res = NextResponse.json({
    registrations: items.map((r) => ({
      id: String(r.id),
      userId: r.userId != null ? String(r.userId) : null,
      displayName: r.display_name ?? r.displayName ?? null,
      email: r.email ?? null,
      status: r.status,
      formData: r.formData ?? null,
      registeredAt: r.registeredAt ?? '',
    })),
    total: items.length,
    page,
    pageSize,
    totalPages: 1,
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
