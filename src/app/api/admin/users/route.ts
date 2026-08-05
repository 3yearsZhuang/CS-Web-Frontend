/**
 * @file 管理员用户列表 API — GET /api/admin/users（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { proxyBackend, setAuthCookies, toAdminUserList } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const page = Number(url.searchParams.get('page')) || 1;
  const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 50, 100);
  const search = url.searchParams.get('search') || undefined;
  const status = url.searchParams.get('status') || undefined;
  const role = url.searchParams.get('role') || undefined;

  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (search) params.set('search', search);
  if (status) params.set('status', status);
  if (role) params.set('role', role);

  const proxy = await proxyBackend(req, { path: `/admin/users?${params.toString()}` });
  const res = NextResponse.json(toAdminUserList((proxy.body ?? {}) as Record<string, unknown>));
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
