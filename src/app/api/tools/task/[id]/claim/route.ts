/**
 * @file 任务认领 API — POST/DELETE /api/tools/task/[id]/claim（BFF 薄转发）
 *
 * TOOLS-GOV Slice B：后端真实路由是 /tools/tasks/...（复数，原路径 404）；
 * 新增 DELETE 转发（后端新增按任务取消认领路由，原取消功能整链路缺失）。
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const { id } = await params;
  const proxy = await proxyBackend(req, {
    path: `/tools/tasks/${encodeURIComponent(id)}/claim`,
    method: 'POST',
  });

  if (proxy.status !== 200 && proxy.status !== 201) {
    const err = normalizeError(proxy.body, '认领失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ claim: proxy.body });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const { id } = await params;
  const proxy = await proxyBackend(req, {
    path: `/tools/tasks/${encodeURIComponent(id)}/claim`,
    method: 'DELETE',
  });

  if (proxy.status !== 200 && proxy.status !== 204) {
    const err = normalizeError(proxy.body, '取消认领失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ ok: true });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
