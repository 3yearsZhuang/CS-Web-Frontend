/**
 * @file 组件指南 API — PUT /api/tools/component-registry/[id]/guide（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as {
    useCases?: string[];
    antiPatterns?: string[];
  };
  const { id } = await params;

  const proxy = await proxyBackend(req, {
    path: `/tools/component-registry/${encodeURIComponent(id)}/guide`,
    method: 'PUT',
    jsonBody: { use_cases: body.useCases ?? [], anti_patterns: body.antiPatterns ?? [] },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '更新失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ component: proxy.body });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
