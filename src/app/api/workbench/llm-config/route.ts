/**
 * @file 用户 LLM 配置 API — GET/PUT /api/workbench/llm-config（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/workbench/llm-config' });
  const status = proxy.status === 200 ? 200 : 401;
  const res = NextResponse.json(proxy.body ?? {}, { status });
  if (proxy.clearAuth && status === 401) clearAuthCookies(res);
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function PUT(req: Request) {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // 空 body
  }
  const proxy = await proxyBackend(req, {
    path: '/workbench/llm-config',
    method: 'PUT',
    jsonBody: body,
  });
  const status = proxy.status === 200 ? 200 : 401;
  const res = NextResponse.json(proxy.body ?? {}, { status });
  if (proxy.clearAuth && status === 401) clearAuthCookies(res);
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
