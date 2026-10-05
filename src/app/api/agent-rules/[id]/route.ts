/**
 * @file Agent 自动化规则 API — PATCH/DELETE /api/agent-rules/[id]（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';
import { mapRuleBody } from '../route';

export const runtime = 'nodejs';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const proxy = await proxyBackend(req, {
    path: `/agent-rules/${encodeURIComponent(id)}`,
    method: 'PATCH',
    jsonBody: mapRuleBody(body),
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '更新规则失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ rule: proxy.body });
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
    path: `/agent-rules/${encodeURIComponent(id)}`,
    method: 'DELETE',
  });

  if (proxy.status !== 200 && proxy.status !== 204) {
    const err = normalizeError(proxy.body, '删除规则失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ ok: true });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
