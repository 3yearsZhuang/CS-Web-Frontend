/**
 * @file 学习助手 Agent Run 列表 — GET /api/tools/auxilio/conversations/[id]/runs
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proxy = await proxyBackend(req, { path: `/auxilio/conversations/${id}/runs` });
  const res = NextResponse.json(proxy.body ?? {}, { status: proxy.status });
  if (proxy.clearAuth && proxy.status === 401) clearAuthCookies(res);
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
