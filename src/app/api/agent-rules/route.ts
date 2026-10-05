/**
 * @file Agent 自动化规则 API — GET/POST /api/agent-rules（BFF 薄转发）
 *
 * AG-P3-02：入参 schema 为 snake_case（extra=forbid），此处做 camel→snake 映射；
 * 出参为 TZModel camelCase，透传列表。
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

/** AgentRuleInput camel → snake（后端 extra=forbid，禁止透传未知键） */
export function mapRuleBody(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (body.name !== undefined) out.name = body.name;
  if (body.triggerType !== undefined) out.trigger_type = body.triggerType;
  if (body.condition !== undefined) out.condition = body.condition;
  if (body.actionPayload !== undefined) out.action_payload = body.actionPayload;
  if (body.quietHoursStart !== undefined) out.quiet_hours_start = body.quietHoursStart;
  if (body.quietHoursEnd !== undefined) out.quiet_hours_end = body.quietHoursEnd;
  if (body.cooldownMinutes !== undefined) out.cooldown_minutes = body.cooldownMinutes;
  if (body.maxPerHour !== undefined) out.max_per_hour = body.maxPerHour;
  return out;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = new URLSearchParams();
  const enabled = url.searchParams.get('enabled');
  if (enabled !== null && enabled !== '') params.set('enabled', enabled);
  params.set('page', url.searchParams.get('page') ?? '1');
  params.set('page_size', url.searchParams.get('pageSize') ?? '50');

  const proxy = await proxyBackend(req, { path: `/agent-rules?${params.toString()}` });
  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '获取规则失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const items = Array.isArray(proxy.body) ? proxy.body : [];
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const proxy = await proxyBackend(req, {
    path: '/agent-rules',
    method: 'POST',
    jsonBody: mapRuleBody(body),
  });

  if (proxy.status !== 200 && proxy.status !== 201) {
    const err = normalizeError(proxy.body, '创建规则失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ rule: proxy.body }, { status: 201 });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
