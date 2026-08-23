/**
 * @file 学习助手错题复习反馈 API — POST /api/tools/auxilio/mistakes/[id]/review
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    // 让后端统一返回 schema 错误
  }
  const proxy = await proxyBackend(req, {
    path: `/auxilio/mistakes/${id}/review`,
    method: 'POST',
    jsonBody: body,
  });
  const res = NextResponse.json(proxy.body ?? {}, { status: proxy.status });
  if (proxy.clearAuth && proxy.status === 401) clearAuthCookies(res);
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
