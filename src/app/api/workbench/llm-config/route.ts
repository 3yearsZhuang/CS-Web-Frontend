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
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    // 空 body
  }
  // 后端契约（OpenAPI 基线）为 snake_case：apiKey→api_key、baseUrl→base_url
  const payload = {
    provider: typeof body.provider === 'string' ? body.provider : 'openai',
    api_key: typeof body.apiKey === 'string' ? body.apiKey : null,
    base_url: typeof body.baseUrl === 'string' ? body.baseUrl : null,
    model: typeof body.model === 'string' ? body.model : 'gpt-4o-mini',
    web_search_enabled: typeof body.webSearchEnabled === 'boolean' ? body.webSearchEnabled : true,
    trajectory_enabled: typeof body.trajectoryEnabled === 'boolean' ? body.trajectoryEnabled : true,
  };
  const proxy = await proxyBackend(req, {
    path: '/workbench/llm-config',
    method: 'PUT',
    jsonBody: payload,
  });
  const status = proxy.status === 200 ? 200 : 401;
  const res = NextResponse.json(proxy.body ?? {}, { status });
  if (proxy.clearAuth && status === 401) clearAuthCookies(res);
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
