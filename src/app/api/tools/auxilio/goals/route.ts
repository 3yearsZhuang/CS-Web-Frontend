/**
 * @file 学习助手目标 API — GET/POST /api/tools/auxilio/goals
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const proxy = await proxyBackend(req, { path: `/auxilio/goals${url.search}` });
  const res = NextResponse.json(proxy.body ?? {}, { status: proxy.status });
  if (proxy.clearAuth && proxy.status === 401) clearAuthCookies(res);
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function POST(req: Request) {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // 让后端统一返回 schema 错误
  }
  const proxy = await proxyBackend(req, {
    path: '/auxilio/goals',
    method: 'POST',
    jsonBody: body,
  });
  const res = NextResponse.json(proxy.body ?? {}, { status: proxy.status });
  if (proxy.clearAuth && proxy.status === 401) clearAuthCookies(res);
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
