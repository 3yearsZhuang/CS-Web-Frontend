/**
 * @file BFF 路由回归测试（TOOLS-GOV 切片 A/B/C/D 锁定）：tools 域用户端与管理端
 * 薄转发路由。proxyBackend 打桩，验证「后端真实响应形状 → BFF 出参」的映射
 * 契约不被回退（复数路径、snake→camel、裸数组解包、错误透传）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/backend-client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/backend-client')>();
  return { ...actual, proxyBackend: vi.fn() };
});

vi.mock('@/shared/security/security', () => ({
  assertAllowedOrigin: vi.fn(() => null),
  getCookieValue: vi.fn(() => null),
}));

import { proxyBackend, type ProxyResult } from '@/shared/backend-client';
import { GET as pointsGet } from '@/app/api/tools/points/route';
import { GET as leaderboardGet } from '@/app/api/tools/points/leaderboard/route';
import { GET as taskListGet } from '@/app/api/tools/task/route';
import { GET as myClaimsGet } from '@/app/api/tools/task/claims/route';
import { DELETE as claimDelete, POST as claimPost } from '@/app/api/tools/task/[id]/claim/route';
import { GET as componentsGet } from '@/app/api/tools/component-registry/route';
import { GET as componentGet, PUT as componentPut } from '@/app/api/tools/component-registry/[id]/route';
import { GET as resourceGet } from '@/app/api/tools/resource/route';
import {
  DELETE as adminTaskDelete,
  GET as adminTaskGet,
  POST as adminTaskPost,
} from '@/app/api/admin/tools/task/route';
import { GET as adminResourceGet, PATCH as adminResourcePatch } from '@/app/api/admin/tools/resource/route';

const mockedProxy = vi.mocked(proxyBackend);

function ok(body: unknown): ProxyResult {
  return { status: 200, body, clearAuth: false };
}

function status(status: number, body: unknown = null, clearAuth = false): ProxyResult {
  return { status, body, clearAuth };
}

function jsonReq(
  url: string,
  method = 'GET',
  body?: unknown,
): Request {
  return new Request(url, {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }
      : {}),
  });
}

async function routeParams<T extends Record<string, string>>(params: T) {
  return { params: Promise.resolve(params) };
}

beforeEach(() => {
  mockedProxy.mockReset();
});

describe('GET /api/tools/points（Slice A：/tools/points/me + snake→camel）', () => {
  it('映射 profile 包装与流水字段', async () => {
    mockedProxy.mockResolvedValue(
      ok({
        balance: 120,
        level: 3,
        level_title: '熟练工',
        transactions: [
          {
            id: 9,
            amount: 10,
            reason: '任务奖励',
            source_type: 'task',
            balance_after: 120,
            created_at: '2026-09-14T00:00:00Z',
          },
        ],
      }),
    );
    const res = await pointsGet(jsonReq('http://localhost/api/tools/points'));
    const data = (await res.json()) as { profile: Record<string, unknown> };
    expect(mockedProxy).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({ path: '/tools/points/me' }),
    );
    expect(data.profile.balance).toBe(120);
    expect(data.profile.level).toBe(3);
    expect(data.profile.levelTitle).toBe('熟练工');
    const tx = (data.profile.transactions as Array<Record<string, unknown>>)[0];
    expect(tx.sourceType).toBe('task');
    expect(tx.balanceAfter).toBe(120);
    expect(typeof tx.id).toBe('string');
  });

  it('非 200 透传后端状态码与错误体', async () => {
    mockedProxy.mockResolvedValue(status(500, { error: 'boom' }));
    const res = await pointsGet(jsonReq('http://localhost/api/tools/points'));
    expect(res.status).toBe(500);
  });
});

describe('GET /api/tools/points/leaderboard（Slice A：limit 参数 + 裸数组）', () => {
  it('topN 折算 limit，裸数组映射', async () => {
    mockedProxy.mockResolvedValue(
      ok([{ user_id: 1, display_name: '甲', balance: 99, level: 2, level_title: '工' }]),
    );
    const res = await leaderboardGet(
      jsonReq('http://localhost/api/tools/points/leaderboard?topN=5'),
    );
    expect(mockedProxy).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({ path: '/tools/points/leaderboard?limit=5' }),
    );
    const data = (await res.json()) as { leaderboard: Array<Record<string, unknown>> };
    expect(data.leaderboard[0].userId).toBe('1');
    expect(data.leaderboard[0].displayName).toBe('甲');
  });

  it('后端 {leaderboard:[]} 包装兼容；非 200 回空榜并透传状态', async () => {
    mockedProxy.mockResolvedValueOnce(ok({ leaderboard: [{ user_id: 2 }] }));
    const wrapped = await leaderboardGet(jsonReq('http://localhost/api/tools/points/leaderboard'));
    expect(((await wrapped.json()) as { leaderboard: unknown[] }).leaderboard).toHaveLength(1);

    mockedProxy.mockResolvedValue(status(404));
    const res = await leaderboardGet(jsonReq('http://localhost/api/tools/points/leaderboard'));
    expect(res.status).toBe(404);
    expect(((await res.json()) as { leaderboard: unknown[] }).leaderboard).toEqual([]);
  });
});

describe('GET /api/tools/task（Slice B：复数路径 + 分页映射）', () => {
  it('category 透传、TaskOut snake→camel、total_pages 兜底', async () => {
    mockedProxy.mockResolvedValue(
      ok({
        items: [
          {
            id: 3,
            title: '写周报',
            category: 'writing',
            tags: ['doc'],
            points: 20,
            max_claimants: 2,
            claimant_count: 1,
            status: 'published',
            created_by: 5,
            my_claim: { id: 7 },
          },
        ],
        total: 1,
        total_pages: 1,
      }),
    );
    const res = await taskListGet(
      jsonReq('http://localhost/api/tools/task?category=writing&page=2&pageSize=50'),
    );
    expect(mockedProxy).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({ path: '/tools/tasks?page=2&page_size=50&category=writing' }),
    );
    const data = (await res.json()) as { tasks: Array<Record<string, unknown>> };
    const t = data.tasks[0];
    expect(t.maxClaimants).toBe(2);
    expect(t.claimantCount).toBe(1);
    expect(t.myClaim).toEqual({ id: 7 });
  });
});

describe('GET /api/tools/task/claims（Slice B：/tools/tasks/claims/me）', () => {
  it('claims 映射 + 非 200 回空列表', async () => {
    mockedProxy.mockResolvedValue(
      ok({
        claims: [{ id: 7, task_id: 3, user_id: 1, status: 'submitted', review_note: 'ok' }],
      }),
    );
    const res = await myClaimsGet(jsonReq('http://localhost/api/tools/task/claims'));
    expect(mockedProxy).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({ path: '/tools/tasks/claims/me' }),
    );
    const data = (await res.json()) as { claims: Array<Record<string, unknown>>; total: number };
    expect(data.total).toBe(1);
    expect(data.claims[0].taskId).toBe('3');
    expect(data.claims[0].reviewNote).toBe('ok');

    mockedProxy.mockResolvedValue(status(401, null, true));
    const res2 = await myClaimsGet(jsonReq('http://localhost/api/tools/task/claims'));
    expect(((await res2.json()) as { claims: unknown[] }).claims).toEqual([]);
  });
});

describe('POST/DELETE /api/tools/task/[id]/claim（Slice B：认领 + 取消）', () => {
  it('POST 转发复数认领路径；DELETE 转发取消路径', async () => {
    mockedProxy.mockResolvedValue(status(201, { id: 7 }));
    const post = await claimPost(
      jsonReq('http://localhost/api/tools/task/3/claim', 'POST'),
      await routeParams({ id: '3' }),
    );
    expect(mockedProxy).toHaveBeenLastCalledWith(
      expect.any(Request),
      expect.objectContaining({ path: '/tools/tasks/3/claim', method: 'POST' }),
    );
    expect(post.status).toBe(200);

    mockedProxy.mockResolvedValue(ok({ ok: true }));
    const del = await claimDelete(
      jsonReq('http://localhost/api/tools/task/3/claim', 'DELETE'),
      await routeParams({ id: '3' }),
    );
    expect(mockedProxy).toHaveBeenLastCalledWith(
      expect.any(Request),
      expect.objectContaining({ path: '/tools/tasks/3/claim', method: 'DELETE' }),
    );
    expect(del.status).toBe(200);
  });
});

describe('/api/tools/component-registry（Slice D：/tools/components）', () => {
  it('GET 裸数组解包为 { components }', async () => {
    mockedProxy.mockResolvedValue(ok([{ id: 1, name: 'button' }]));
    const res = await componentsGet(jsonReq('http://localhost/api/tools/component-registry'));
    expect(mockedProxy).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({ path: '/tools/components' }),
    );
    const data = (await res.json()) as { components: unknown[] };
    expect(data.components).toHaveLength(1);
  });

  it('[id] GET 命中透传、未命中 { component: null }；PUT 转发', async () => {
    mockedProxy.mockResolvedValue(ok({ id: 1 }));
    const hit = await componentGet(
      jsonReq('http://localhost/api/tools/component-registry/1'),
      await routeParams({ id: '1' }),
    );
    expect(mockedProxy).toHaveBeenLastCalledWith(
      expect.any(Request),
      expect.objectContaining({ path: '/tools/components/1' }),
    );
    expect(((await hit.json()) as { component: unknown }).component).toEqual({ id: 1 });

    mockedProxy.mockResolvedValue(status(404));
    const miss = await componentGet(
      jsonReq('http://localhost/api/tools/component-registry/9'),
      await routeParams({ id: '9' }),
    );
    expect(((await miss.json()) as { component: unknown }).component).toBeNull();

    mockedProxy.mockResolvedValue(ok({ id: 1, name: 'updated' }));
    await componentPut(
      jsonReq('http://localhost/api/tools/component-registry/1', 'PUT', { name: 'updated' }),
      await routeParams({ id: '1' }),
    );
    expect(mockedProxy).toHaveBeenLastCalledWith(
      expect.any(Request),
      expect.objectContaining({ path: '/tools/components/1', method: 'PUT' }),
    );
  });
});

describe('GET /api/tools/resource（Slice C 复数对齐）', () => {
  it('分页参数透传映射', async () => {
    mockedProxy.mockResolvedValue(
      ok({ items: [{ id: 4, title: '课件', resource_type: 'file', tech_tags: ['py'] }], total: 1, total_pages: 1 }),
    );
    const res = await resourceGet(jsonReq('http://localhost/api/tools/resource?page=3&pageSize=10'));
    expect(mockedProxy).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({ path: expect.stringContaining('/tools/resources') }),
    );
    const data = (await res.json()) as { resources: Array<Record<string, unknown>> };
    expect(data.resources[0].resourceType).toBe('file');
    expect(data.resources[0].techTags).toEqual(['py']);
  });
});

describe('/api/admin/tools/task（Slice B：?sub= 路由族）', () => {
  const CLAIM = {
    id: 7,
    task_id: 3,
    user_id: 1,
    display_name: '甲',
    status: 'submitted',
    claim_note: 'n',
    review_note: null,
    created_at: '2026-09-14T00:00:00Z',
  };
  const TASK = { id: 3, title: '任务', status: 'draft', tags: [], created_by: 1 };

  it('GET ?sub=claims → pending 列表映射', async () => {
    mockedProxy.mockResolvedValue(ok({ items: [CLAIM], total: 1 }));
    const res = await adminTaskGet(jsonReq('http://localhost/api/admin/tools/task?sub=claims'));
    expect(mockedProxy).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({ path: '/tools/admin/tasks/claims/pending' }),
    );
    const data = (await res.json()) as { claims: Array<Record<string, unknown>>; total: number };
    expect(data.claims[0].displayName).toBe('甲');
    expect(data.total).toBe(1);
  });

  it('GET 无 sub → 任务分页列表映射', async () => {
    mockedProxy.mockResolvedValue(ok({ items: [TASK], total: 1 }));
    const res = await adminTaskGet(jsonReq('http://localhost/api/admin/tools/task?page=1&pageSize=20'));
    expect(mockedProxy).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({ path: '/tools/admin/tasks?page=1&page_size=20' }),
    );
    const data = (await res.json()) as { tasks: Array<Record<string, unknown>> };
    expect(data.tasks[0].createdBy).toBe('1');
  });

  it('POST ?sub=claim 按 approved 分发 approve/reject', async () => {
    mockedProxy.mockResolvedValue(ok({ id: 7 }));
    await adminTaskPost(
      jsonReq('http://localhost/api/admin/tools/task?sub=claim', 'POST', { claimId: '7', approved: true }),
    );
    expect(mockedProxy).toHaveBeenLastCalledWith(
      expect.any(Request),
      expect.objectContaining({ path: '/tools/admin/tasks/claims/7/approve' }),
    );
    await adminTaskPost(
      jsonReq('http://localhost/api/admin/tools/task?sub=claim', 'POST', { claimId: '7', approved: false }),
    );
    expect(mockedProxy).toHaveBeenLastCalledWith(
      expect.any(Request),
      expect.objectContaining({ path: '/tools/admin/tasks/claims/7/reject' }),
    );
  });

  it('POST 创建 → 复数路径 + snake_case body + 201', async () => {
    mockedProxy.mockResolvedValue(ok(TASK));
    const res = await adminTaskPost(
      jsonReq('http://localhost/api/admin/tools/task', 'POST', {
        title: '任务',
        contentMarkdown: '# md',
        tags: ['a'],
        maxClaimants: 3,
      }),
    );
    expect(mockedProxy).toHaveBeenLastCalledWith(
      expect.any(Request),
      expect.objectContaining({
        path: '/tools/admin/tasks',
        method: 'POST',
        jsonBody: expect.objectContaining({
          content_markdown: '# md',
          max_claimants: 3,
          status: 'draft',
        }),
      }),
    );
    expect(res.status).toBe(201);
  });

  it('POST publish/close/delete 动作分发', async () => {
    mockedProxy.mockResolvedValue(ok(TASK));
    for (const sub of ['publish', 'close', 'delete']) {
      await adminTaskPost(
        jsonReq(`http://localhost/api/admin/tools/task?sub=${sub}`, 'POST', { taskId: '3' }),
      );
    }
    const paths = mockedProxy.mock.calls.map(
      (c) => (c[1] as { path: string }).path,
    );
    expect(paths).toEqual([
      '/tools/admin/tasks/3/publish',
      '/tools/admin/tasks/3/close',
      '/tools/admin/tasks/3',
    ]);
    expect(
      mockedProxy.mock.calls.map((c) => (c[1] as { method: string }).method),
    ).toEqual(['POST', 'POST', 'DELETE']);
  });

  it('参数缺失 / 未知操作 → 400', async () => {
    const noId = await adminTaskDelete(jsonReq('http://localhost/api/admin/tools/task', 'DELETE'));
    expect(noId.status).toBe(400);
    const unknownSub = await adminTaskPost(
      jsonReq('http://localhost/api/admin/tools/task?sub=bogus', 'POST', { taskId: '3' }),
    );
    expect(unknownSub.status).toBe(400);
  });
});

describe('/api/admin/tools/resource（Slice C：分页折算 + 审核）', () => {
  it('GET page/pageSize 折算 skip/limit', async () => {
    mockedProxy.mockResolvedValue(ok({ items: [], total: 0, total_pages: 1 }));
    await adminResourceGet(
      jsonReq('http://localhost/api/admin/tools/resource?page=3&pageSize=10&status=pending'),
    );
    expect(mockedProxy).toHaveBeenLastCalledWith(
      expect.any(Request),
      expect.objectContaining({ path: '/tools/admin/resources?skip=20&limit=10&status=pending' }),
    );
  });

  it('PATCH ?id= 按 status 分发 approve/reject，note→reason', async () => {
    mockedProxy.mockResolvedValue(ok({}));
    await adminResourcePatch(
      jsonReq('http://localhost/api/admin/tools/resource?id=4', 'PATCH', { status: 'published' }),
    );
    expect(mockedProxy).toHaveBeenLastCalledWith(
      expect.any(Request),
      expect.objectContaining({ path: '/tools/admin/resources/4/approve' }),
    );
    await adminResourcePatch(
      jsonReq('http://localhost/api/admin/tools/resource?id=4', 'PATCH', {
        status: 'hidden',
        note: '质量不足',
      }),
    );
    expect(mockedProxy).toHaveBeenLastCalledWith(
      expect.any(Request),
      expect.objectContaining({ path: `/tools/admin/resources/4/reject?reason=${encodeURIComponent('质量不足')}` }),
    );
    const bad = await adminResourcePatch(
      jsonReq('http://localhost/api/admin/tools/resource?id=4', 'PATCH', { status: 'bogus' }),
    );
    expect(bad.status).toBe(400);
  });
});

describe('BFF 错误分支：normalizeError 透传 + clearAuth', () => {
  it('admin task：GET claims 失败优雅降级空列表；列表 500 透传；POST 族 500', async () => {
    mockedProxy.mockResolvedValue(status(500, { error: 'x' }, true));
    const claims = await adminTaskGet(jsonReq('http://localhost/api/admin/tools/task?sub=claims'));
    expect(claims.status).toBe(200);
    expect(((await claims.json()) as { claims: unknown[] }).claims).toEqual([]);
    expect(
      (await adminTaskGet(jsonReq('http://localhost/api/admin/tools/task'))).status,
    ).toBe(500);
    expect(
      (
        await adminTaskPost(
          jsonReq('http://localhost/api/admin/tools/task?sub=claim', 'POST', { claimId: '7', approved: true }),
        )
      ).status,
    ).toBe(500);
    expect(
      (
        await adminTaskPost(jsonReq('http://localhost/api/admin/tools/task', 'POST', { title: 't' }))
      ).status,
    ).toBe(500);
    expect(
      (
        await adminTaskPost(
          jsonReq('http://localhost/api/admin/tools/task?sub=publish', 'POST', { taskId: '3' }),
        )
      ).status,
    ).toBe(500);
    expect(
      (await adminTaskDelete(jsonReq('http://localhost/api/admin/tools/task?id=3', 'DELETE'))).status,
    ).toBe(500);
  });

  it('admin task：claim 缺 claimId / create 缺 title → 400', async () => {
    expect(
      (
        await adminTaskPost(jsonReq('http://localhost/api/admin/tools/task?sub=claim', 'POST', {}))
      ).status,
    ).toBe(400);
    expect(
      (await adminTaskPost(jsonReq('http://localhost/api/admin/tools/task', 'POST', {}))).status,
    ).toBe(400);
    expect(
      (
        await adminTaskPost(jsonReq('http://localhost/api/admin/tools/task?sub=publish', 'POST', {}))
      ).status,
    ).toBe(400);
  });

  it('admin resource：POST approve/reject 与错误分支', async () => {
    const { POST: adminResourcePost } = await import('@/app/api/admin/tools/resource/route');
    mockedProxy.mockResolvedValue(ok({}));
    const good = await adminResourcePost(
      jsonReq('http://localhost/api/admin/tools/resource', 'POST', {
        resourceId: '4',
        action: 'reject',
        reviewNote: '差',
      }),
    );
    expect(good.status).toBe(200);
    expect(mockedProxy).toHaveBeenLastCalledWith(
      expect.any(Request),
      expect.objectContaining({ path: `/tools/admin/resources/4/reject?reason=${encodeURIComponent('差')}` }),
    );
    mockedProxy.mockResolvedValue(status(500, null, true));
    expect(
      (
        await adminResourcePost(
          jsonReq('http://localhost/api/admin/tools/resource', 'POST', { resourceId: '4', action: 'approve' }),
        )
      ).status,
    ).toBe(500);
    expect(
      (
        await adminResourcePatch(
          jsonReq('http://localhost/api/admin/tools/resource?id=4', 'PATCH', { status: 'published' }),
        )
      ).status,
    ).toBe(500);
    expect(
      (
        await adminResourcePatch(jsonReq('http://localhost/api/admin/tools/resource', 'PATCH', {}))
      ).status,
    ).toBe(400);
  });

  it('task/[id]/claim：错误透传', async () => {
    mockedProxy.mockResolvedValue(status(500, { error: 'x' }, true));
    const res = await claimPost(
      jsonReq('http://localhost/api/tools/task/3/claim', 'POST'),
      await routeParams({ id: '3' }),
    );
    expect(res.status).toBe(500);
    const del = await claimDelete(
      jsonReq('http://localhost/api/tools/task/3/claim', 'DELETE'),
      await routeParams({ id: '3' }),
    );
    expect(del.status).toBe(500);
  });

  it('component-registry/[id]：GET 非 200 兜底已在上方覆盖；PUT 错误透传', async () => {
    mockedProxy.mockResolvedValue(status(500, { error: 'x' }, true));
    const res = await componentPut(
      jsonReq('http://localhost/api/tools/component-registry/1', 'PUT', { name: 'x' }),
      await routeParams({ id: '1' }),
    );
    expect(res.status).toBe(500);
  });
});
