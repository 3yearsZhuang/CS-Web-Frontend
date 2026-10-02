/**
 * @file 管理端任务 API — /api/admin/tools/task（BFF 薄转发）
 *
 * TOOLS-GOV Slice B：原实现按 body.action 路由且路径为单数 /tools/admin/task，
 * 而消费方 use-tasks.ts 实际按 ?sub= 查询参数发起（claims GET / publish / claim 审核 /
 * create），且后端真实路由为复数 /tools/admin/tasks——创建/发布/审核/待审核列表此前
 * 全部失效。本实现按消费方约定路由：
 *   GET  ?sub=claims                → GET  /tools/admin/tasks/claims/pending
 *   GET  ?page=&pageSize=（无 sub）  → GET  /tools/admin/tasks（管理端任务分页列表）
 *   POST ?sub=publish  {taskId}     → POST /tools/admin/tasks/{id}/publish
 *   POST ?sub=close    {taskId}     → POST /tools/admin/tasks/{id}/close
 *   POST ?sub=delete   {taskId}     → DELETE /tools/admin/tasks/{id}
 *   DELETE ?id={taskId} {password}  → DELETE /tools/admin/tasks/{id}（密码确认仅 UI 层，
 *                                      权限由后端 RBAC 承担）
 *   POST ?sub=claim    {claimId,approved} → POST .../claims/{id}/approve|reject
 *   POST（无 sub，含 title）        → POST /tools/admin/tasks（创建）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

/** TaskClaimOut（snake_case）→ ClaimData（camelCase） */
function mapClaim(c: Record<string, unknown>) {
  return {
    id: String(c.id),
    taskId: c.task_id != null ? String(c.task_id) : null,
    userId: c.user_id != null ? String(c.user_id) : null,
    displayName: c.display_name ?? null,
    status: c.status,
    claimNote: c.claim_note ?? null,
    completedAt: c.completed_at ?? null,
    reviewedBy: c.reviewed_by != null ? String(c.reviewed_by) : null,
    reviewNote: c.review_note ?? null,
    createdAt: c.created_at ?? '',
  };
}

/** TaskOut（snake_case）→ Task（camelCase） */
function mapTask(t: Record<string, unknown>) {
  return {
    id: String(t.id),
    title: t.title,
    description: t.description ?? '',
    contentMarkdown: t.content_markdown ?? null,
    category: t.category,
    tags: Array.isArray(t.tags) ? t.tags : [],
    points: t.points ?? 0,
    maxClaimants: t.max_claimants ?? 1,
    status: t.status,
    createdBy: t.created_by != null ? String(t.created_by) : null,
    publishedAt: t.published_at ?? null,
    closedAt: t.closed_at ?? null,
    createdAt: t.created_at ?? '',
    updatedAt: t.updated_at ?? '',
    claimCount: t.claim_count ?? 0,
  };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sub = url.searchParams.get('sub');

  if (sub === 'claims') {
    const proxy = await proxyBackend(req, { path: '/tools/admin/tasks/claims/pending' });
    if (proxy.status !== 200) {
      const res = NextResponse.json({ claims: [], total: 0 });
      if (proxy.clearAuth) clearAuthCookies(res);
      return res;
    }
    const body = (proxy.body ?? {}) as Record<string, unknown>;
    const items = (Array.isArray(body.items) ? body.items : []) as Array<
      Record<string, unknown>
    >;
    const res = NextResponse.json({
      claims: items.map(mapClaim),
      total: Number(body.total ?? items.length),
    });
    if (proxy.authPair) setAuthCookies(res, proxy.authPair);
    return res;
  }

  // 无 sub：管理端任务分页列表（tool-task-manage fetchTasks）
  const page = Number(url.searchParams.get('page')) || 1;
  const pageSize = Math.min(Number(url.searchParams.get('pageSize')) || 20, 100);
  const proxy = await proxyBackend(req, {
    path: `/tools/admin/tasks?page=${page}&page_size=${pageSize}`,
  });
  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '加载任务失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const body = (proxy.body ?? {}) as Record<string, unknown>;
  const items = (Array.isArray(body.items) ? body.items : []) as Array<
    Record<string, unknown>
  >;
  const res = NextResponse.json({
    tasks: items.map(mapTask),
    total: Number(body.total ?? items.length),
  });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}

export async function DELETE(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const url = new URL(req.url);
  const taskId = url.searchParams.get('id');
  if (!taskId) {
    return NextResponse.json({ error: '缺少 id', code: 'VALIDATION_FAILED' }, { status: 400 });
  }
  const proxy = await proxyBackend(req, {
    path: `/tools/admin/tasks/${encodeURIComponent(taskId)}`,
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

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const url = new URL(req.url);
  const sub = url.searchParams.get('sub');
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;

  // ---- 审核：approve / reject（积分联动在后端 service 内）----
  if (sub === 'claim') {
    const claimId = body.claimId as string | undefined;
    if (!claimId) {
      return NextResponse.json({ error: '缺少 claimId', code: 'VALIDATION_FAILED' }, { status: 400 });
    }
    const approved = body.approved === true;
    const proxy = await proxyBackend(req, {
      path: `/tools/admin/tasks/claims/${encodeURIComponent(claimId)}/${
        approved ? 'approve' : 'reject'
      }`,
      method: 'POST',
    });
    if (proxy.status !== 200) {
      const err = normalizeError(proxy.body, '审核操作失败');
      const res = NextResponse.json(err, { status: proxy.status });
      if (proxy.clearAuth) clearAuthCookies(res);
      return res;
    }
    const res = NextResponse.json({ claim: proxy.body });
    if (proxy.authPair) setAuthCookies(res, proxy.authPair);
    return res;
  }

  // ---- 创建（无 sub 且含 title；对齐 use-tasks.handleCreate 的直传字段）----
  if (!sub || sub === 'create') {
    if (!body.title) {
      return NextResponse.json({ error: '缺少任务数据', code: 'VALIDATION_FAILED' }, { status: 400 });
    }
    const proxy = await proxyBackend(req, {
      path: '/tools/admin/tasks',
      method: 'POST',
      jsonBody: {
        title: body.title,
        description: body.description ?? '',
        content_markdown: (body.contentMarkdown as string | undefined) ?? null,
        category: body.category ?? 'general',
        tags: Array.isArray(body.tags) ? body.tags : [],
        points: body.points ?? 10,
        max_claimants: body.maxClaimants ?? 1,
        status: 'draft',
      },
    });
    if (proxy.status !== 200 && proxy.status !== 201) {
      const err = normalizeError(proxy.body, '创建失败');
      const res = NextResponse.json(err, { status: proxy.status });
      if (proxy.clearAuth) clearAuthCookies(res);
      return res;
    }
    const res = NextResponse.json({ task: proxy.body }, { status: 201 });
    if (proxy.authPair) setAuthCookies(res, proxy.authPair);
    return res;
  }

  // ---- 任务级操作：publish / close / delete ----
  const taskId = body.taskId as string | undefined;
  if (!taskId) {
    return NextResponse.json({ error: '缺少 taskId', code: 'VALIDATION_FAILED' }, { status: 400 });
  }
  const actionMap: Record<string, { path: string; method: string }> = {
    publish: { path: `/tools/admin/tasks/${encodeURIComponent(taskId)}/publish`, method: 'POST' },
    close: { path: `/tools/admin/tasks/${encodeURIComponent(taskId)}/close`, method: 'POST' },
    delete: { path: `/tools/admin/tasks/${encodeURIComponent(taskId)}`, method: 'DELETE' },
  };
  const action = actionMap[sub];
  if (!action) {
    return NextResponse.json({ error: '未知操作', code: 'VALIDATION_FAILED' }, { status: 400 });
  }
  const proxy = await proxyBackend(req, { path: action.path, method: action.method });
  if (proxy.status !== 200) {
    const err = normalizeError(proxy.body, '操作失败');
    const res = NextResponse.json(err, { status: proxy.status });
    if (proxy.clearAuth) clearAuthCookies(res);
    return res;
  }
  const res = NextResponse.json({ task: proxy.body });
  if (proxy.authPair) setAuthCookies(res, proxy.authPair);
  return res;
}
