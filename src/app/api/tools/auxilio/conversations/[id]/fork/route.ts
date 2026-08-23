/**
 * @file 学习助手会话分支 API — POST /api/tools/auxilio/conversations/[id]/fork
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: unknown = undefined;
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const proxy = await proxyBackend(req, {
    path: `/auxilio/conversations/${id}/fork`,
    method: 'POST',
    jsonBody: body,
  });
  const res = NextResponse.json(proxy.body ?? {}, { status: proxy.status });
  if (proxy.clearAuth && proxy.status === 401) clearAuthCookies(res);
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
