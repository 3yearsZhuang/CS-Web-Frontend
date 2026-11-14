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
import { GET as componentsGet } from '@/app/api/tools/component-registry/route';
import { GET as componentGet, PUT as componentPut } from '@/app/api/tools/component-registry/[id]/route';
import { GET as resourceGet } from '@/app/api/tools/resource/route';
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

  it('component-registry/[id]：GET 非 200 兜底已在上方覆盖；PUT 错误透传', async () => {
    mockedProxy.mockResolvedValue(status(500, { error: 'x' }, true));
    const res = await componentPut(
      jsonReq('http://localhost/api/tools/component-registry/1', 'PUT', { name: 'x' }),
      await routeParams({ id: '1' }),
    );
    expect(res.status).toBe(500);
  });
});
