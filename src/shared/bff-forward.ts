/**
 * @file 任务/团队 BFF 通用转发：Cookie 身份、写操作 Origin 校验、幂等键注入与
 * camelCase ↔ snake_case 边界转换。
 */
import { NextResponse } from 'next/server';

import { assertAllowedOrigin } from '@/shared/security/security';
import {
  camelizeDeep,
  clearAuthCookies,
  normalizeError,
  proxyBackend,
  setAuthCookies,
  snakeizeDeep,
} from '@/shared/backend-client';

type RouteContext = { params: Promise<{ path?: string[] }> };

/** 仅允许已声明的原生任务/团队端点，避免变成任意后端路径代理。 */
const ALLOWED_ROUTES: Record<string, Array<{ method: string; pattern: RegExp }>> = {
  '/tasks': [
    { method: 'GET', pattern: /^\/tasks$/ },
    { method: 'POST', pattern: /^\/tasks$/ },
    { method: 'GET', pattern: /^\/tasks\/me\/published$/ },
    { method: 'GET', pattern: /^\/tasks\/me\/claims$/ },
    { method: 'GET', pattern: /^\/tasks\/\d+$/ },
    { method: 'PATCH', pattern: /^\/tasks\/\d+$/ },
    { method: 'DELETE', pattern: /^\/tasks\/\d+$/ },
    { method: 'POST', pattern: /^\/tasks\/\d+\/review-requests$/ },
    { method: 'GET', pattern: /^\/tasks\/\d+\/claims$/ },
    { method: 'POST', pattern: /^\/tasks\/\d+\/claims$/ },
    { method: 'GET', pattern: /^\/tasks\/\d+\/history$/ },
    { method: 'POST', pattern: /^\/task-claims\/\d+\/cancel$/ },
    { method: 'POST', pattern: /^\/task-claims\/\d+\/submissions$/ },
  ],
  '/teams': [
    { method: 'GET', pattern: /^\/teams$/ },
    { method: 'POST', pattern: /^\/teams$/ },
    { method: 'GET', pattern: /^\/teams\/invitations\/me$/ },
    { method: 'POST', pattern: /^\/teams\/invitations\/\d+\/(accept|reject)$/ },
    { method: 'GET', pattern: /^\/teams\/\d+$/ },
    { method: 'PATCH', pattern: /^\/teams\/\d+$/ },
    { method: 'POST', pattern: /^\/teams\/\d+\/invitations$/ },
    { method: 'POST', pattern: /^\/teams\/\d+\/leave$/ },
  ],
  '/admin/tasks': [
    { method: 'GET', pattern: /^\/admin\/tasks$/ },
    { method: 'POST', pattern: /^\/admin\/tasks\/\d+\/reviews$/ },
    { method: 'POST', pattern: /^\/admin\/tasks\/\d+\/force-close$/ },
  ],
  '/admin/task-submissions': [
    { method: 'POST', pattern: /^\/admin\/task-submissions\/\d+\/reviews$/ },
  ],
  // 财务管理：读模型 + 发行/调拨/峰间调拨（finance:*，后端再校验峰范围）
  '/admin/finance': [
    { method: 'GET', pattern: /^\/admin\/finance\/(treasury|stats|transactions)$/ },
    { method: 'GET', pattern: /^\/admin\/finance\/peaks$/ },
    { method: 'GET', pattern: /^\/admin\/finance\/peaks\/\d+$/ },
    { method: 'GET', pattern: /^\/admin\/finance\/peaks\/\d+\/members$/ },
    { method: 'GET', pattern: /^\/admin\/finance\/users\/\d+$/ },
    { method: 'POST', pattern: /^\/admin\/finance\/(adjustments|allocations|peak-transfers)$/ },
  ],
  // 组织管理：成员与峰写操作 + 审计历史（member:* / peak:* / audit:read）
  '/admin/organization': [
    { method: 'GET', pattern: /^\/admin\/organization\/history$/ },
    { method: 'GET', pattern: /^\/admin\/organization\/members\/\d+\/history$/ },
    { method: 'POST', pattern: /^\/admin\/organization\/members$/ },
    { method: 'PATCH', pattern: /^\/admin\/organization\/members\/\d+$/ },
    { method: 'POST', pattern: /^\/admin\/organization\/members\/\d+\/(move|remove)$/ },
    { method: 'POST', pattern: /^\/admin\/organization\/peaks$/ },
    { method: 'PATCH', pattern: /^\/admin\/organization\/peaks\/\d+$/ },
    { method: 'POST', pattern: /^\/admin\/organization\/peaks\/\d+\/archive$/ },
  ],
};

function isAllowed(basePath: string, fullPath: string, method: string): boolean {
  return (ALLOWED_ROUTES[basePath] ?? []).some(
    (route) => route.method === method && route.pattern.test(fullPath),
  );
}

function newIdempotencyKey(): string {
  return typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function forwardToBackend(
  req: Request,
  { params }: RouteContext,
  method: string,
  basePath: string,
): Promise<NextResponse> {
  if (method !== 'GET') {
    const originErr = assertAllowedOrigin(req);
    if (originErr) return originErr;
  }

  const { path = [] } = await params;
  const url = new URL(req.url);
  const suffix = path.length
    ? `/${path.map((segment) => encodeURIComponent(segment)).join('/')}`
    : '';
  const backendPath = `${basePath}${suffix}`;
  if (!isAllowed(basePath, backendPath, method)) {
    return NextResponse.json({ error: '不允许的接口路径', code: 'BFF_PATH_FORBIDDEN' }, { status: 404 });
  }
  const backendPathWithQuery = `${backendPath}${url.search}`;

  const headers: Record<string, string> = {};
  const ifMatch = req.headers.get('If-Match');
  if (ifMatch) headers['If-Match'] = ifMatch;
  if (method !== 'GET') {
    headers['Idempotency-Key'] =
      req.headers.get('Idempotency-Key') ?? newIdempotencyKey();
  }

  let jsonBody: unknown;
  if (method === 'POST' || method === 'PATCH' || method === 'PUT') {
    const raw = await req.text();
    if (raw.trim()) {
      try {
        jsonBody = snakeizeDeep(JSON.parse(raw));
      } catch {
        return NextResponse.json({ error: '请求体不是合法 JSON' }, { status: 400 });
      }
    }
  }

  const proxy = await proxyBackend(req, { path: backendPathWithQuery, method, headers, jsonBody });
  if (proxy.status === 204) {
    const res = new NextResponse(null, { status: 204 });
    if (proxy.authPair) setAuthCookies(res, proxy.authPair);
    return res;
  }
  if (proxy.status < 200 || proxy.status >= 300) {
    const err = normalizeError(proxy.body, '请求失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }

  const res = NextResponse.json(camelizeDeep(proxy.body ?? {}), { status: proxy.status });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
