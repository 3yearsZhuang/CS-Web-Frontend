/**
 * @file 活动模块单元测试（ADR-009 Repository 抽象层）
 *
 * 覆盖核心服务层逻辑：
 *   - CRUD：createEvent / getEvent / listEvents / updateEvent / deleteEvent / autoArchivePastEvents / batchUpdateEvents
 *   - 报名：容量校验 / 重复报名 / 取消重报 / 管理员操作 / 统计
 *
 * 测试策略：内存 SQLite + _setDbEngineForTest 注入 DbEngine，手动建 events / event_registrations 表
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { _setDbEngineForTest } from '@/shared/db/drivers';
import { createSqliteTestEngine } from './dbEngine';

const inMemoryDb = new Database(':memory:');

const testEngine = createSqliteTestEngine(inMemoryDb);
_setDbEngineForTest(testEngine);

vi.mock('@/shared/logger', () => ({
  logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
  __esModule: true,
}));

vi.mock('@/shared/security/audit', () => ({
  logAdminAction: () => {},
  __esModule: true,
}));

vi.mock('@/shared/events/event-bus', () => ({
  appBus: { emit: () => {}, on: () => {}, off: () => {} },
  __esModule: true,
}));

import {
  createEvent,
  getEvent,
  listEvents,
  updateEvent,
  deleteEvent,
  batchUpdateEvents,
  autoArchivePastEvents,
} from '@/modules/events/server/crud';
import {
  registerForEvent,
  cancelRegistration,
  getRegistration,
  adminAddRegistration,
  adminUpdateRegistrationStatus,
  getEventRegistrationStats,
  getUserRegisteredEvents,
} from '@/modules/events/server/registration';

const ADMIN_ID = 'admin-001';
const USER_ID = 'user-001';
const USER_ID_2 = 'user-002';

function initTestSchema() {
  inMemoryDb.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      content TEXT,
      date TEXT,
      location TEXT,
      capacity INTEGER DEFAULT 0,
      tags TEXT,
      cover_image TEXT,
      status TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS event_registrations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      status TEXT DEFAULT 'registered',
      form_data TEXT,
      registered_at TEXT DEFAULT (datetime('now')),
      cancelled_at TEXT,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, event_id)
    );
  `);
}

function clearTables() {
  inMemoryDb.exec('DELETE FROM events');
  inMemoryDb.exec('DELETE FROM event_registrations');
}

function makeValidInput(overrides: Record<string, unknown> = {}) {
  return {
    title: '测试活动',
    description: '这是一个测试活动',
    status: 'upcoming' as const,
    date: '2026-08-15',
    capacity: 10,
    tags: ['tag1'],
    ...overrides,
  };
}

describe('events 模块 — CRUD 服务', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
  });

  describe('createEvent', () => {
    it('创建成功并返回活动 ID', async () => {
      const { id } = await createEvent(makeValidInput(), ADMIN_ID);
      expect(id).toBeDefined();
      const fetched = await getEvent(id);
      expect(fetched.id).toBe(id);
      expect(fetched.title).toBe('测试活动');
      expect(fetched.status).toBe('upcoming');
      expect(fetched.capacity).toBe(10);
      expect(fetched.topics).toEqual(['tag1']);
      expect(fetched.tags).toEqual(['tag1']);
      expect(fetched.isPinned).toBe(false);
    });

    it('创建后可通过 getEvent 查询到', async () => {
      const { id } = await createEvent(makeValidInput(), ADMIN_ID);
      const fetched = await getEvent(id);
      expect(fetched.id).toBe(id);
    });
  });

  describe('getEvent', () => {
    it('不存在的 ID 抛 NOT_FOUND', async () => {
      await expect(getEvent('non-existent')).rejects.toThrow();
    });

    it('自动附加报名人数 registeredCount', async () => {
      const { id } = await createEvent(makeValidInput({ capacity: 10 }), ADMIN_ID);
      await registerForEvent(USER_ID, id);
      const fetched = await getEvent(id);
      expect(fetched.registeredCount).toBe(1);
    });
  });

  describe('autoArchivePastEvents — 日期格式兼容（P0 回归）', () => {
    it('点分隔日期 YYYY.MM.DD — 同年已过日期被归档', async () => {
      await createEvent(makeValidInput({ title: '过去-点分隔', date: '2020.01.15', status: 'upcoming' }), ADMIN_ID);
      await createEvent(makeValidInput({ title: '未来-点分隔', date: '2099.12.31', status: 'upcoming' }), ADMIN_ID);
      const archived = await autoArchivePastEvents();
      expect(archived).toBe(1);
      const { events } = await listEvents();
      const past = events.find((e) => e.title === '过去-点分隔');
      const future = events.find((e) => e.title === '未来-点分隔');
      expect(past!.status).toBe('ended');
      expect(future!.status).toBe('upcoming');
    });

    it('横线分隔日期 YYYY-MM-DD — 同年已过日期被归档', async () => {
      await createEvent(makeValidInput({ title: '过去-横线', date: '2020-01-15', status: 'ongoing' }), ADMIN_ID);
      const archived = await autoArchivePastEvents();
      expect(archived).toBe(1);
      const { events } = await listEvents();
      expect(events[0].status).toBe('ended');
    });

    it('斜线分隔日期 YYYY/MM/DD — 同年已过日期被归档', async () => {
      await createEvent(makeValidInput({ title: '过去-斜线', date: '2020/01/15', status: 'upcoming' }), ADMIN_ID);
      const archived = await autoArchivePastEvents();
      expect(archived).toBe(1);
    });

    it('已 ended 的活动不重复归档', async () => {
      await createEvent(makeValidInput({ title: '已结束', date: '2020.01.15', status: 'ended' }), ADMIN_ID);
      const archived = await autoArchivePastEvents();
      expect(archived).toBe(0);
    });

    it('无日期的活动不归档', async () => {
      await createEvent(makeValidInput({ title: '无日期', date: '', status: 'upcoming' }), ADMIN_ID);
      const archived = await autoArchivePastEvents();
      expect(archived).toBe(0);
    });

    it('getEvent 触发单条归档 — 点分隔同年已过', async () => {
      const { id } = await createEvent(makeValidInput({ title: '过去', date: '2020.03.15', status: 'upcoming' }), ADMIN_ID);
      const fetched = await getEvent(id);
      expect(fetched.status).toBe('ended');
    });
  });

  describe('listEvents', () => {
    it('返回 PaginatedEvents 且包含全部活动', async () => {
      await createEvent(makeValidInput({ title: '活动 A' }), ADMIN_ID);
      await createEvent(makeValidInput({ title: '活动 B' }), ADMIN_ID);
      const result = await listEvents();
      expect(Array.isArray(result.events)).toBe(true);
      expect(result.events).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('带分页参数时返回正确分页', async () => {
      for (let i = 0; i < 5; i++) {
        await createEvent(makeValidInput({ title: `活动 ${i}` }), ADMIN_ID);
      }
      const result = await listEvents({ page: 1, pageSize: 2 });
      expect(result.events).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.totalPages).toBe(3);
    });

    it('按状态筛选', async () => {
      await createEvent(makeValidInput({ title: '即将开始', status: 'upcoming' }), ADMIN_ID);
      await createEvent(makeValidInput({ title: '已结束', status: 'ended' }), ADMIN_ID);
      const { events } = await listEvents({ status: 'upcoming' });
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('即将开始');
    });

    it('搜索标题关键词', async () => {
      await createEvent(makeValidInput({ title: 'React 研讨会' }), ADMIN_ID);
      await createEvent(makeValidInput({ title: 'Vue 工作坊' }), ADMIN_ID);
      const { events } = await listEvents({ search: 'React' });
      expect(events).toHaveLength(1);
    });
  });

  describe('updateEvent', () => {
    it('更新标题成功', async () => {
      const { id } = await createEvent(makeValidInput(), ADMIN_ID);
      await updateEvent(id, { title: '更新后的标题' }, ADMIN_ID);
      const updated = await getEvent(id);
      expect(updated.title).toBe('更新后的标题');
    });

    it('更新不存在的活动抛 NOT_FOUND', async () => {
      await expect(updateEvent('non-existent', { title: 'x' }, ADMIN_ID)).rejects.toThrow();
    });

    it('更新容量并保留原有 tags', async () => {
      const { id } = await createEvent(makeValidInput({ tags: ['前端', '后端'] }), ADMIN_ID);
      await updateEvent(id, { capacity: 20 }, ADMIN_ID);
      const updated = await getEvent(id);
      expect(updated.capacity).toBe(20);
      expect(updated.tags).toEqual(['前端', '后端']);
    });
  });

  describe('deleteEvent', () => {
    it('软删除：状态置为 deleted 且列表不再返回', async () => {
      const { id } = await createEvent(makeValidInput(), ADMIN_ID);
      await deleteEvent(id, ADMIN_ID);
      const deleted = await getEvent(id);
      expect(deleted.status).toBe('deleted');
      const { events } = await listEvents({ status: 'upcoming' });
      expect(events.find((e) => e.id === id)).toBeUndefined();
    });

    it('删除不存在的活动抛 NOT_FOUND', async () => {
      await expect(deleteEvent('non-existent', ADMIN_ID)).rejects.toThrow();
    });
  });

  describe('batchUpdateEvents', () => {
    it('批量更新状态', async () => {
      const e1 = await createEvent(makeValidInput({ title: 'E1' }), ADMIN_ID);
      const e2 = await createEvent(makeValidInput({ title: 'E2' }), ADMIN_ID);
      const result = await batchUpdateEvents(ADMIN_ID, [e1.id, e2.id], { status: 'ongoing' });
      expect(result.updated).toBe(2);
      expect((await getEvent(e1.id)).status).toBe('ongoing');
    });

    it('部分不存在时报告失败', async () => {
      const e1 = await createEvent(makeValidInput({ title: 'E1' }), ADMIN_ID);
      const result = await batchUpdateEvents(ADMIN_ID, [e1.id, 'fake-id'], { status: 'ended' });
      expect(result.updated).toBe(1);
    });
  });
});

describe('events 模块 — 报名服务', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
  });

  describe('registerForEvent', () => {
    it('首次报名成功', async () => {
      const { id } = await createEvent(makeValidInput({ capacity: 10 }), ADMIN_ID);
      const result = await registerForEvent(USER_ID, id);
      expect(result.status).toBe('registered');
    });

    it('重复报名抛 ALREADY_REGISTERED', async () => {
      const { id } = await createEvent(makeValidInput({ capacity: 10 }), ADMIN_ID);
      await registerForEvent(USER_ID, id);
      await expect(registerForEvent(USER_ID, id)).rejects.toThrow();
    });

    it('容量满后报名进入 waitlisted', async () => {
      const { id } = await createEvent(makeValidInput({ capacity: 1 }), ADMIN_ID);
      await registerForEvent(USER_ID, id);
      const r2 = await registerForEvent(USER_ID_2, id);
      expect(r2.status).toBe('waitlisted');
    });

    it('取消后可重新报名', async () => {
      const { id } = await createEvent(makeValidInput({ capacity: 10 }), ADMIN_ID);
      await registerForEvent(USER_ID, id);
      await cancelRegistration(USER_ID, id);
      const result = await registerForEvent(USER_ID, id);
      expect(result.status).toBe('registered');
    });

    it('活动不存在抛 NOT_FOUND', async () => {
      await expect(registerForEvent(USER_ID, 'non-existent')).rejects.toThrow();
    });

    it('携带 formData 报名成功', async () => {
      const { id } = await createEvent(makeValidInput({ capacity: 10 }), ADMIN_ID);
      const result = await registerForEvent(USER_ID, id, { phone: '13800000000' });
      expect(result.status).toBe('registered');
      const reg = await getRegistration(USER_ID, id);
      expect(reg!.form_data).toBe(JSON.stringify({ phone: '13800000000' }));
    });
  });

  describe('cancelRegistration', () => {
    it('取消报名成功', async () => {
      const { id } = await createEvent(makeValidInput({ capacity: 10 }), ADMIN_ID);
      await registerForEvent(USER_ID, id);
      await cancelRegistration(USER_ID, id);
      const reg = await getRegistration(USER_ID, id);
      expect(reg!.status).toBe('cancelled');
      expect(reg!.cancelled_at).not.toBeNull();
    });

    it('取消不存在的报名抛 NOT_REGISTERED', async () => {
      const { id } = await createEvent(makeValidInput(), ADMIN_ID);
      await expect(cancelRegistration(USER_ID, id)).rejects.toThrow();
    });

    it('重复取消不抛错', async () => {
      const { id } = await createEvent(makeValidInput({ capacity: 10 }), ADMIN_ID);
      await registerForEvent(USER_ID, id);
      await cancelRegistration(USER_ID, id);
      await expect(cancelRegistration(USER_ID, id)).resolves.toBeUndefined();
    });
  });

  describe('adminAddRegistration', () => {
    it('管理员为用户报名成功', async () => {
      const { id } = await createEvent(makeValidInput({ capacity: 10 }), ADMIN_ID);
      const result = await adminAddRegistration(ADMIN_ID, USER_ID, id);
      expect(result.registration.status).toBe('registered');
    });

    it('用户已报名时抛 ALREADY_REGISTERED', async () => {
      const { id } = await createEvent(makeValidInput({ capacity: 10 }), ADMIN_ID);
      await registerForEvent(USER_ID, id);
      await expect(adminAddRegistration(ADMIN_ID, USER_ID, id)).rejects.toThrow();
    });

    it('容量满时进入 waitlisted', async () => {
      const { id } = await createEvent(makeValidInput({ capacity: 1 }), ADMIN_ID);
      await registerForEvent(USER_ID, id);
      const result = await adminAddRegistration(ADMIN_ID, USER_ID_2, id);
      expect(result.registration.status).toBe('waitlisted');
    });
  });

  describe('adminUpdateRegistrationStatus', () => {
    it('更新报名状态为 waitlisted', async () => {
      const { id } = await createEvent(makeValidInput({ capacity: 10 }), ADMIN_ID);
      await registerForEvent(USER_ID, id);
      const reg = await getRegistration(USER_ID, id);
      await adminUpdateRegistrationStatus(ADMIN_ID, reg!.id, 'waitlisted');
      const updated = await getRegistration(USER_ID, id);
      expect(updated!.status).toBe('waitlisted');
    });

    it('更新为 cancelled 时设置 cancelledAt', async () => {
      const { id } = await createEvent(makeValidInput({ capacity: 10 }), ADMIN_ID);
      await registerForEvent(USER_ID, id);
      const reg = await getRegistration(USER_ID, id);
      await adminUpdateRegistrationStatus(ADMIN_ID, reg!.id, 'cancelled');
      const updated = await getRegistration(USER_ID, id);
      expect(updated!.status).toBe('cancelled');
      expect(updated!.cancelled_at).not.toBeNull();
    });

    it('报名记录不存在时静默成功（更新 0 行）', async () => {
      await expect(
        adminUpdateRegistrationStatus(ADMIN_ID, 'fake-id', 'cancelled'),
      ).resolves.toBeUndefined();
    });
  });

  describe('getEventRegistrationStats', () => {
    it('正确统计各状态人数', async () => {
      const { id } = await createEvent(makeValidInput({ capacity: 10 }), ADMIN_ID);
      await registerForEvent(USER_ID, id);
      await registerForEvent(USER_ID_2, id);
      await cancelRegistration(USER_ID_2, id);
      const stats = await getEventRegistrationStats(id);
      expect(stats.total).toBe(2);
      expect(stats.registered).toBe(1);
      expect(stats.cancelled).toBe(1);
      expect(stats.waitlisted).toBe(0);
    });
  });

  describe('getUserRegisteredEvents', () => {
    it('返回用户已报名的活动列表', async () => {
      const e1 = await createEvent(makeValidInput({ title: 'E1', capacity: 10 }), ADMIN_ID);
      const e2 = await createEvent(makeValidInput({ title: 'E2', capacity: 10 }), ADMIN_ID);
      await registerForEvent(USER_ID, e1.id);
      await registerForEvent(USER_ID, e2.id);
      await cancelRegistration(USER_ID, e2.id);
      const events = await getUserRegisteredEvents(USER_ID);
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('E1');
    });
  });
});
