/**
 * @file Auxilio 学习助手 API — GET /api/tools/auxilio（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/tools/auxilio' });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ weakTags: [], recommendedResources: [] }, { status: 401 });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const body = (proxy.body ?? {}) as Record<string, unknown>;
  const weakTags = (Array.isArray(body.weak_tags) ? body.weak_tags : []) as Array<
    Record<string, unknown>
  >;
  const resources = (Array.isArray(body.recommended_resources)
    ? body.recommended_resources
    : []) as Array<Record<string, unknown>>;
  const res = NextResponse.json({
    weakTags: weakTags.map((t) => ({
      tag: t.tag,
      total: t.total ?? 0,
      correct: t.correct ?? 0,
      accuracy: t.accuracy ?? 0,
    })),
    recommendedResources: resources.map((r) => ({
      id: String(r.id),
      title: r.title,
      url: r.url,
      description: r.description ?? null,
      resourceType: r.resource_type,
      techTags: Array.isArray(r.tech_tags) ? r.tech_tags : [],
    })),
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
