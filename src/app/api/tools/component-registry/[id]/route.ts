/**
 * @file 组件详情 API — GET/PUT/DELETE /api/tools/component-registry/[id]（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const proxy = await proxyBackend(req, {
    path: `/tools/components/${encodeURIComponent(id)}`,
  });

  if (proxy.status !== 200) {
    return NextResponse.json({ component: null });
  }
  const res = NextResponse.json({ component: proxy.body });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const { id } = await params;

  const proxy = await proxyBackend(req, {
    path: `/tools/components/${encodeURIComponent(id)}`,
    method: 'PUT',
    jsonBody: {
      name: body.name,
      slug: body.slug,
      category: body.category,
      description: body.description,
      sort_order: body.sortOrder,
      migration_status: body.migrationStatus,
    },
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

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const { id } = await params;
  const proxy = await proxyBackend(req, {
    path: `/tools/components/${encodeURIComponent(id)}`,
    method: 'DELETE',
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '删除失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ ok: true });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const { id } = await params;

  const proxy = await proxyBackend(req, {
    // TOOLS-GOV Slice D：后端真实路径 /tools/components（原 404）
    path: `/tools/components/${encodeURIComponent(id)}/migration-status`,
    method: 'PUT',
    jsonBody: {
      migrationStatus: body.migrationStatus,
    },
  });

  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '更新迁移状态失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  // 消费方 store 读取 { visibilityOpened: boolean }（后端 ComponentMigrationStatusOutput camel）
  const result = (proxy.body ?? {}) as Record<string, unknown>;
  const res = NextResponse.json({ visibilityOpened: result.visibilityOpened === true });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
