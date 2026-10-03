/**
 * @file 番茄钟专注记录上报 — POST /api/workbench/focus-sessions（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // 空 body
  }
  const proxy = await proxyBackend(req, {
    path: '/workbench/focus-sessions',
    method: 'POST',
    jsonBody: body,
  });
  // P1-8 修复：此前任何非 200 一律映射 401，把 422 校验错误伪装成未登录，掩盖了
  // 入参 casing 错配。透传后端真实状态码，仅在 clearAuth（真 401）时清 cookie。
  const res = NextResponse.json(proxy.body ?? {}, { status: proxy.status });
  if (proxy.clearAuth) clearAuthCookies(res);
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
