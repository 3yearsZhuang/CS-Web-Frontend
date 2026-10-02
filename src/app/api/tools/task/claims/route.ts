/**
 * @file 我的任务认领 API — GET /api/tools/task/claims（BFF 薄转发）
 *
 * TOOLS-GOV Slice B：后端真实路由是 /tools/tasks/claims/me（原路径 404），
 * 响应为 {claims:[TaskClaimOut]}（snake_case），此处映射为 ClaimData（camelCase）。
 */
import { NextResponse } from 'next/server';
import { clearAuthCookies, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/tools/tasks/claims/me' });

  if (proxy.status !== 200) {
    const res = NextResponse.json({ claims: [] });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const body = (proxy.body ?? {}) as Record<string, unknown>;
  const items = (Array.isArray(body.claims) ? body.claims : []) as Array<
    Record<string, unknown>
  >;
  const res = NextResponse.json({
    claims: items.map((c) => ({
      id: String(c.id),
      taskId: c.task_id != null ? String(c.task_id) : null,
      userId: c.user_id != null ? String(c.user_id) : null,
      status: c.status,
      claimNote: c.claim_note ?? null,
      completedAt: c.completed_at ?? null,
      reviewedBy: c.reviewed_by != null ? String(c.reviewed_by) : null,
      reviewNote: c.review_note ?? null,
      createdAt: c.created_at ?? '',
    })),
    total: items.length,
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
