/**
 * @file 管理端任务 API — POST /api/tools/admin/task（BFF 薄转发）
 */
import { NextResponse } from 'next/server';
import { assertAllowedOrigin } from '@/shared/security/security';
import { clearAuthCookies, normalizeError, proxyBackend, setAuthCookies } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const parsed = await req.json().catch(() => null);
  const body = parsed as Record<string, unknown>;
  const action = body.action; // create | publish | close | delete | review

  if (action === 'create') {
    const task = body.task as Record<string, unknown> | undefined;
    if (!task) {
      return NextResponse.json({ error: '缺少任务数据', code: 'VALIDATION_FAILED' }, { status: 400 });
    }
    const proxy = await proxyBackend(req, {
      path: '/tools/admin/task',
      method: 'POST',
      jsonBody: {
        title: task.title,
        description: task.description,
        content_markdown: task.contentMarkdown,
        category: task.category ?? 'general',
        tags: Array.isArray(task.tags) ? task.tags : [],
        points: task.points ?? 10,
        max_claimants: task.maxClaimants ?? 1,
        status: task.status ?? 'draft',
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

  const taskId = body.taskId as string | undefined;
  if (!taskId) {
    return NextResponse.json({ error: '缺少 taskId', code: 'VALIDATION_FAILED' }, { status: 400 });
  }
  const pathMap: Record<string, string> = {
    publish: '/tools/admin/task/${id}/publish',
    close: '/tools/admin/task/${id}/close',
    delete: '/tools/admin/task/${id}',
  };
  const path = pathMap[action as string];
  if (!path) {
    return NextResponse.json({ error: '未知操作', code: 'VALIDATION_FAILED' }, { status: 400 });
  }
  const proxy = await proxyBackend(req, {
    path: path.replace('${id}', encodeURIComponent(taskId)),
    method: action === 'delete' ? 'DELETE' : 'POST',
  });
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
