/**
 * @file 组件注册表 API — GET/POST /api/tools/component-registry（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/tools/component-registry' });
  const body = (proxy.body ?? {}) as Record<string, unknown>;
  const items = (Array.isArray(body.components) ? body.components : []) as Array<
    Record<string, unknown>
  >;
  const res = NextResponse.json({ components: items });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  const proxy = await proxyBackend(req, {
    path: '/tools/component-registry',
    method: 'POST',
    jsonBody: {
      name: body.name,
      slug: body.slug,
      category: body.category ?? 'general',
      description: body.description,
      sort_order: body.sortOrder ?? 0,
      migration_status: body.migrationStatus ?? 'legacy',
    },
  });

  if (proxy.status !== 200 && proxy.status !== 201) {
    const err = normalizeError(proxy.body, '创建失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ component: proxy.body }, { status: 201 });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
