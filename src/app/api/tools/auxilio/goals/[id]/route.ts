/**
 * @file 学习助手目标生命周期 API — PATCH/DELETE
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

async function forward(req: Request, id: string, method: 'PATCH' | 'DELETE') {
  let body: unknown = undefined;
  if (method === 'PATCH') {
    try {
      body = await req.json();
    } catch {
      body = {};
    }
  }
  const proxy = await proxyBackend(req, {
    path: `/auxilio/goals/${id}`,
    method,
    jsonBody: body,
  });
  const res = NextResponse.json(proxy.body ?? {}, { status: proxy.status });
  if (proxy.clearAuth && proxy.status === 401) clearAuthCookies(res);
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forward(req, id, 'PATCH');
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return forward(req, id, 'DELETE');
}
