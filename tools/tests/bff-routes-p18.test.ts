/**
 * @file BFF 路由回归测试（P1-8 修复锁定）：admin/join、admin/events/[id]/registrations、
 * admin/notifications（GET 群发记录 + POST 群发）、workbench/focus-sessions。
 * proxyBackend 打桩，验证「后端真实响应形状 → BFF 出参」的映射契约不被回退。
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
import { GET as adminJoinGet } from '@/app/api/admin/join/route';
import { GET as eventRegsGet } from '@/app/api/admin/events/[id]/registrations/route';
import { GET as notifGet, POST as notifPost } from '@/app/api/admin/notifications/route';
import { POST as focusPost } from '@/app/api/workbench/focus-sessions/route';

const mockedProxy = vi.mocked(proxyBackend);

function ok(body: unknown): ProxyResult {
  return { status: 200, body, clearAuth: false };
}

function jsonReq(url: string, method = 'GET', body?: unknown): Request {
  return new Request(url, {
    method,
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }
      : {}),
  });
}

beforeEach(() => {
  mockedProxy.mockReset();
});

describe('GET /api/admin/join（P1-8：后端裸数组）', () => {
  it('裸数组 JoinApplicationOut → { applications, total }，字段 camel 直读', async () => {
    mockedProxy.mockResolvedValue(
      ok([
        {
          id: 7,
          applicantName: '演示同学',
          studentId: '20260001',
          major: '计算机',
          techTags: ['Web'],
          reason: '热爱学习',
          contactQq: '123',
          contactPhone: null,
          userId: 1,
          status: 'pending',
          reviewedBy: null,
          reviewNote: null,
          createdAt: '2026-08-18T10:00:00Z',
          updatedAt: '2026-08-18T10:00:00Z',
        },
        { id: 8, applicantName: '同学乙', status: 'approved' },
      ]),
    );
    const res = await adminJoinGet(jsonReq('http://localhost/api/admin/join?page=1&pageSize=20'));
    const data = (await res.json()) as {
      applications: Array<Record<string, unknown>>;
      total: number;
      totalPages: number;
    };
    expect(mockedProxy).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({ path: '/join/admin?page=1&page_size=20' }),
    );
    expect(data.applications).toHaveLength(2);
    expect(data.applications[0].applicantName).toBe('演示同学');
    expect(data.applications[0].techTags).toEqual(['Web']);
    expect(data.total).toBe(2);
    expect(data.totalPages).toBe(1);
  });

  it('非 200 → 空列表兜底', async () => {
    mockedProxy.mockResolvedValue({ status: 403, body: null, clearAuth: false });
    const res = await adminJoinGet(jsonReq('http://localhost/api/admin/join'));
    const data = (await res.json()) as { applications: unknown[]; total: number };
    expect(data.applications).toEqual([]);
    expect(data.total).toBe(0);
  });
});

describe('GET /api/admin/events/[id]/registrations（P1-8：后端裸数组）', () => {
  it('裸数组 EventRegistrationOut → { registrations }，camel 直读', async () => {
    mockedProxy.mockResolvedValue(
      ok([
        {
          id: 3,
          userId: 9,
          eventId: 7,
          status: 'registered',
          formData: { experience: '2 年' },
          registeredAt: '2026-08-10T08:00:00Z',
          cancelledAt: null,
        },
      ]),
    );
    const res = await eventRegsGet(
      jsonReq('http://localhost/api/admin/events/7/registrations?page=1&pageSize=50'),
      { params: Promise.resolve({ id: '7' }) },
    );
    const data = (await res.json()) as {
      registrations: Array<Record<string, unknown>>;
      total: number;
    };
    expect(mockedProxy).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({
        path: '/admin/events/7/registrations?page=1&page_size=50',
      }),
    );
    expect(data.registrations).toHaveLength(1);
    expect(data.registrations[0].userId).toBe('9');
    expect(data.registrations[0].registeredAt).toBe('2026-08-10T08:00:00Z');
    expect(data.registrations[0].formData).toEqual({ experience: '2 年' });
    expect(data.total).toBe(1);
  });
});

describe('/api/admin/notifications（P1-8：GET 聚合形状对齐 + 补 POST 转发）', () => {
  it('GET：聚合 dict 数组 → broadcasts: NotifHistoryItem[]', async () => {
    mockedProxy.mockResolvedValue(
      ok([
        { title: '开学通知', content: 'x', type: 'admin', created_at: '2026-09-01T08:00:00Z', cnt: 42 },
      ]),
    );
    const res = await notifGet(jsonReq('http://localhost/api/admin/notifications?limit=20'));
    const data = (await res.json()) as {
      broadcasts: Array<Record<string, unknown>>;
    };
    expect(mockedProxy).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({ path: '/notifications/broadcast-history?limit=20' }),
    );
    expect(data.broadcasts[0].title).toBe('开学通知');
    expect(data.broadcasts[0].createdAt).toBe('2026-09-01T08:00:00Z');
    expect(data.broadcasts[0].recipientCount).toBe(42);
  });

  it('POST：转发 /notifications/broadcast 并把 sent 映射为 count', async () => {
    mockedProxy.mockResolvedValue(ok({ ok: true, sent: 5 }));
    const res = await notifPost(
      jsonReq('http://localhost/api/admin/notifications', 'POST', { title: 'hi', content: 'yo' }),
    );
    const data = (await res.json()) as { ok: boolean; count: number };
    expect(mockedProxy).toHaveBeenCalledWith(
      expect.any(Request),
      expect.objectContaining({
        path: '/notifications/broadcast',
        method: 'POST',
        jsonBody: { title: 'hi', content: 'yo' },
      }),
    );
    expect(data).toEqual({ ok: true, count: 5 });
  });

  it('POST：缺 title → 400 且不触达后端', async () => {
    const res = await notifPost(
      jsonReq('http://localhost/api/admin/notifications', 'POST', { content: 'no title' }),
    );
    expect(res.status).toBe(400);
    expect(mockedProxy).not.toHaveBeenCalled();
  });
});

describe('POST /api/workbench/focus-sessions（P1-8：状态码透传）', () => {
  it('422 校验错误原样透传（不再吞成 401）', async () => {
    mockedProxy.mockResolvedValue({ status: 422, body: { detail: 'x' }, clearAuth: false });
    const res = await focusPost(
      jsonReq('http://localhost/api/workbench/focus-sessions', 'POST', { durationSeconds: -1 }),
    );
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ detail: 'x' });
  });

  it('200 正常写回', async () => {
    mockedProxy.mockResolvedValue(
      ok({ id: 42, durationMin: 25, createdAt: '2026-09-14T00:00:00Z' }),
    );
    const res = await focusPost(
      jsonReq('http://localhost/api/workbench/focus-sessions', 'POST', {
        durationSeconds: 1500,
        phase: 'focus',
        soundSource: 'beep',
      }),
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id: 42, durationMin: 25, createdAt: '2026-09-14T00:00:00Z' });
  });

  it('401 且 clearAuth → 清 Cookie 标志保留', async () => {
    mockedProxy.mockResolvedValue({ status: 401, body: null, clearAuth: true });
    const res = await focusPost(
      jsonReq('http://localhost/api/workbench/focus-sessions', 'POST', {}),
    );
    expect(res.status).toBe(401);
  });
});
