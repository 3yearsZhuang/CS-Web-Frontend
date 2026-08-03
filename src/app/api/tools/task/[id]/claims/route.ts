/**
 * @file 任务认领列表 API — GET /api/tools/task/[id]/claims（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const proxy = await proxyBackend(req, { path: `/tools/task/${encodeURIComponent(id)}/claims` });
  const list = Array.isArray(proxy.body) ? proxy.body : [];
  const res = NextResponse.json({ claims: list });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
