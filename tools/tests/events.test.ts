/**
 * @file 活动模块单元测试
 *
 * 覆盖核心服务层逻辑：
 *   - CRUD：validateInput / createEvent / getEventById / listEvents / updateEvent / deleteEvent
 *   - 报名：容量校验 / 重复报名 / 取消重报 / 管理员操作 / 统计
 *
 * 测试策略：内存 SQLite + vi.mock 替换 getDb，手动建 events / event_registrations 表
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';

const inMemoryDb = new Database(':memory:');

vi.mock('@/shared/db', () => ({
  getDb: () => inMemoryDb,
  __esModule: true,
}));

vi.mock('@/shared/logger', () => ({
  logger: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
  __esModule: true,
}));

vi.mock('@/shared/security/audit', () => ({
  logAdminAction: () => {},
  __esModule: true,
}));

vi.mock('@/shared/events/event-bus', () => ({
  appBus: {
    emit: () => {},
    on: () => {},
    off: () => {},
  },
  __esModule: true,
}));

import {
  validateInput,
  createEvent,
  getEventById,
  listEvents,
  updateEvent,
  deleteEvent,
  getRegisteredCount,
  batchUpdateEvents,
} from '@/modules/events/server/crud';
import {
  registerEvent,
  cancelEventRegistration,
  getUserRegistration,
  getEventRegistrations,
  adminAddRegistration,
  adminUpdateRegistrationStatus,
  getEventRegistrationStats,
  getUserRegisteredEvents,
} from '@/modules/events/server/registration';
import { autoArchivePastEvents } from '@/modules/events/server/archive';
import { EVENT_LIMITS } from '@/modules/events/types';

const ADMIN_ID = 'admin-001';
const USER_ID = 'user-001';
const USER_ID_2 = 'user-002';

function initTestSchema() {
  inMemoryDb.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      month TEXT,
      date TEXT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT,
      year TEXT,
      topics TEXT,
      tags TEXT,
      is_pinned INTEGER DEFAULT 0,
      capacity INTEGER DEFAULT 0,
      content_markdown TEXT,
      registration_fields TEXT,
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
    topics: ['技术'],
    tags: ['tag1'],
    ...overrides,
  };
}

describe('events 模块 — CRUD 服务', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
  });

  describe('validateInput', () => {
    it('合法输入返回 null', () => {
      expect(validateInput(makeValidInput())).toBeNull();
    });

    it('标题为空时返回错误', () => {
      expect(validateInput(makeValidInput({ title: '' }))).toBe('标题不能为空');
    });

    it('标题超长时返回错误', () => {
      expect(
        validateInput(makeValidInput({ title: 'a'.repeat(EVENT_LIMITS.TITLE_MAX + 1) })),
      ).toBe(`标题不能超过 ${EVENT_LIMITS.TITLE_MAX} 字符`);
    });

    it('状态无效时返回错误', () => {
      expect(
        validateInput(makeValidInput({ status: 'invalid' as never })),
      ).toBe('状态必须为 upcoming / ongoing / ended');
    });

    it('容量为负数时返回错误', () => {
      expect(validateInput(makeValidInput({ capacity: -1 }))).toBe('活动容量不能为负数');
    });

    it('容量非整数时返回错误', () => {
      expect(validateInput(makeValidInput({ capacity: 1.5 }))).toBe('活动容量必须为整数');
    });

    it('自定义字段 key 以下划线开头时返回错误', () => {
      expect(
        validateInput(
          makeValidInput({
            registrationFields: [
              { key: '_secret', label: '秘密', type: 'text' as const, required: false },
            ],
          }),
        ),
      ).toBe('自定义字段的 key 不能以下划线开头');
    });

    it('自定义字段类型无效时返回错误', () => {
      expect(
        validateInput(
          makeValidInput({
            registrationFields: [
              { key: 'field1', label: '字段1', type: 'invalid' as never, required: false },
            ],
          }),
        ),
      ).toBe('自定义字段类型无效：invalid');
    });
  });

  describe('createEvent', () => {
    it('创建成功并返回完整 EventItem', () => {
      const event = createEvent(ADMIN_ID, makeValidInput());
      expect(event.id).toBeDefined();
      expect(event.title).toBe('测试活动');
      expect(event.status).toBe('upcoming');
      expect(event.capacity).toBe(10);
      expect(event.topics).toEqual(['技术']);
      expect(event.tags).toEqual(['tag1']);
      expect(event.isPinned).toBe(false);
    });

    it('输入校验失败时抛 AppError', () => {
      expect(() => createEvent(ADMIN_ID, makeValidInput({ title: '' }))).toThrow();
    });

    it('创建后可通过 getEventById 查询到', () => {
      const event = createEvent(ADMIN_ID, makeValidInput());
      const fetched = getEventById(event.id);
      expect(fetched).not.toBeNull();
      expect(fetched!.id).toBe(event.id);
      expect(fetched!.title).toBe('测试活动');
    });
  });

  describe('getEventById', () => {
    it('不存在的 ID 返回 null', () => {
      expect(getEventById('non-existent')).toBeNull();
    });

    it('withRegisteredCount 选项附加报名人数', () => {
      const event = createEvent(ADMIN_ID, makeValidInput({ capacity: 10 }));
      registerEvent(USER_ID, event.id);
      const fetched = getEventById(event.id, { withRegisteredCount: true });
      expect(fetched!.registeredCount).toBe(1);
    });
  });

  describe('autoArchivePastEvents — 日期格式兼容（P0 回归）', () => {
    /**
     * 历史 P0：date 字段为 YYYY.MM.DD（点分隔），原先直接与 ISO 时间戳比较
     * 因 `.`(0x2E) > `-`(0x2D)，同年已过日期永远不归档。修复后用 REPLACE 归一化分隔符。
     */
    it('点分隔日期 YYYY.MM.DD — 同年已过日期被归档', () => {
      createEvent(ADMIN_ID, makeValidInput({ title: '过去-点分隔', date: '2020.01.15', status: 'upcoming' }));
      createEvent(ADMIN_ID, makeValidInput({ title: '未来-点分隔', date: '2099.12.31', status: 'upcoming' }));
      const archived = autoArchivePastEvents(inMemoryDb);
      expect(archived).toBe(1);
      const events = listEvents() as unknown as { title: string; status: string | null }[];
      const past = events.find((e) => e.title === '过去-点分隔');
      const future = events.find((e) => e.title === '未来-点分隔');
      expect(past!.status).toBe('ended');
      expect(future!.status).toBe('upcoming');
    });

    it('横线分隔日期 YYYY-MM-DD — 同年已过日期被归档', () => {
      createEvent(ADMIN_ID, makeValidInput({ title: '过去-横线', date: '2020-01-15', status: 'ongoing' }));
      const archived = autoArchivePastEvents(inMemoryDb);
      expect(archived).toBe(1);
      const events = listEvents() as unknown as { title: string; status: string | null }[];
      expect(events[0].status).toBe('ended');
    });

    it('斜线分隔日期 YYYY/MM/DD — 同年已过日期被归档', () => {
      createEvent(ADMIN_ID, makeValidInput({ title: '过去-斜线', date: '2020/01/15', status: 'upcoming' }));
      const archived = autoArchivePastEvents(inMemoryDb);
      expect(archived).toBe(1);
    });

    it('已 ended 的活动不重复归档', () => {
      createEvent(ADMIN_ID, makeValidInput({ title: '已结束', date: '2020.01.15', status: 'ended' }));
      const archived = autoArchivePastEvents(inMemoryDb);
      expect(archived).toBe(0);
    });

    it('无日期的活动不归档', () => {
      createEvent(ADMIN_ID, makeValidInput({ title: '无日期', date: '', status: 'upcoming' }));
      const archived = autoArchivePastEvents(inMemoryDb);
      expect(archived).toBe(0);
    });

    it('getEventById 触发单条归档 — 点分隔同年已过', () => {
      const event = createEvent(ADMIN_ID, makeValidInput({ title: '过去', date: '2020.03.15', status: 'upcoming' }));
      const fetched = getEventById(event.id);
      expect(fetched!.status).toBe('ended');
    });
  });

  describe('listEvents', () => {
    it('无分页时返回全部活动数组', () => {
      createEvent(ADMIN_ID, makeValidInput({ title: '活动 A' }));
      createEvent(ADMIN_ID, makeValidInput({ title: '活动 B' }));
      const events = listEvents();
      expect(Array.isArray(events)).toBe(true);
      expect(events).toHaveLength(2);
    });

    it('带分页参数时返回 PaginatedEvents', () => {
      for (let i = 0; i < 5; i++) {
        createEvent(ADMIN_ID, makeValidInput({ title: `活动 ${i}` }));
      }
      const result = listEvents({ page: 1, pageSize: 2 }) as {
        events: unknown[];
        total: number;
        totalPages: number;
      };
      expect(result.events).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.totalPages).toBe(3);
    });

    it('按状态筛选', () => {
      createEvent(ADMIN_ID, makeValidInput({ title: '即将开始', status: 'upcoming' }));
      createEvent(ADMIN_ID, makeValidInput({ title: '已结束', status: 'ended' }));
      const events = listEvents({ status: 'upcoming' }) as unknown as { title: string }[];
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('即将开始');
    });

    it('搜索标题关键词', () => {
      createEvent(ADMIN_ID, makeValidInput({ title: 'React 研讨会' }));
      createEvent(ADMIN_ID, makeValidInput({ title: 'Vue 工作坊' }));
      const events = listEvents({ search: 'React' });
      expect(events).toHaveLength(1);
    });
  });

  describe('updateEvent', () => {
    it('更新标题成功', () => {
      const event = createEvent(ADMIN_ID, makeValidInput());
      const updated = updateEvent(ADMIN_ID, event.id, { title: '更新后的标题' });
      expect(updated.title).toBe('更新后的标题');
    });

    it('更新不存在的活动抛 NOT_FOUND', () => {
      expect(() => updateEvent(ADMIN_ID, 'non-existent', { title: 'x' })).toThrow();
    });

    it('更新容量并保留原有 topics', () => {
      const event = createEvent(
        ADMIN_ID,
        makeValidInput({ topics: ['前端', '后端'] }),
      );
      const updated = updateEvent(ADMIN_ID, event.id, { capacity: 20 });
      expect(updated.capacity).toBe(20);
      expect(updated.topics).toEqual(['前端', '后端']);
    });
  });

  describe('deleteEvent', () => {
    it('删除成功后查询返回 null', () => {
      const event = createEvent(ADMIN_ID, makeValidInput());
      deleteEvent(ADMIN_ID, event.id);
      expect(getEventById(event.id)).toBeNull();
    });

    it('删除不存在的活动抛 NOT_FOUND', () => {
      expect(() => deleteEvent(ADMIN_ID, 'non-existent')).toThrow();
    });
  });

  describe('batchUpdateEvents', () => {
    it('批量更新状态', () => {
      const e1 = createEvent(ADMIN_ID, makeValidInput({ title: 'E1' }));
      const e2 = createEvent(ADMIN_ID, makeValidInput({ title: 'E2' }));
      const result = batchUpdateEvents(ADMIN_ID, [e1.id, e2.id], { status: 'ongoing' });
      expect(result.success).toBe(2);
      expect(result.failed).toBe(0);
      expect(getEventById(e1.id)!.status).toBe('ongoing');
    });

    it('部分不存在时报告失败', () => {
      const e1 = createEvent(ADMIN_ID, makeValidInput({ title: 'E1' }));
      const result = batchUpdateEvents(ADMIN_ID, [e1.id, 'fake-id'], { status: 'ended' });
      expect(result.success).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('无操作时全部失败', () => {
      const result = batchUpdateEvents(ADMIN_ID, ['x'], {});
      expect(result.success).toBe(0);
      expect(result.failed).toBe(1);
    });
  });
});

describe('events 模块 — 报名服务', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
  });

  describe('registerEvent', () => {
    it('首次报名成功', () => {
      const event = createEvent(ADMIN_ID, makeValidInput({ capacity: 10 }));
      const result = registerEvent(USER_ID, event.id);
      expect(result.ok).toBe(true);
      expect(result.registration!.status).toBe('registered');
    });

    it('重复报名抛 ALREADY_REGISTERED', () => {
      const event = createEvent(ADMIN_ID, makeValidInput({ capacity: 10 }));
      registerEvent(USER_ID, event.id);
      expect(() => registerEvent(USER_ID, event.id)).toThrow();
    });

    it('容量满后报名抛 FULL', () => {
      const event = createEvent(ADMIN_ID, makeValidInput({ capacity: 1 }));
      registerEvent(USER_ID, event.id);
      expect(() => registerEvent(USER_ID_2, event.id)).toThrow();
    });

    it('取消后可重新报名', () => {
      const event = createEvent(ADMIN_ID, makeValidInput({ capacity: 10 }));
      registerEvent(USER_ID, event.id);
      cancelEventRegistration(USER_ID, event.id);
      const result = registerEvent(USER_ID, event.id);
      expect(result.ok).toBe(true);
      expect(result.registration!.status).toBe('registered');
    });

    it('取消后重报名但容量满时抛 FULL', () => {
      const event = createEvent(ADMIN_ID, makeValidInput({ capacity: 1 }));
      registerEvent(USER_ID, event.id);
      cancelEventRegistration(USER_ID, event.id);
      registerEvent(USER_ID_2, event.id);
      expect(() => registerEvent(USER_ID, event.id)).toThrow();
    });

    it('活动不存在抛 NOT_FOUND', () => {
      expect(() => registerEvent(USER_ID, 'non-existent')).toThrow();
    });

    it('携带 formData 报名成功', () => {
      const event = createEvent(ADMIN_ID, makeValidInput({ capacity: 10 }));
      const result = registerEvent(USER_ID, event.id, { phone: '13800000000' });
      expect(result.ok).toBe(true);
      expect(result.registration!.formData).toEqual({ phone: '13800000000' });
    });
  });

  describe('cancelEventRegistration', () => {
    it('取消报名成功', () => {
      const event = createEvent(ADMIN_ID, makeValidInput({ capacity: 10 }));
      registerEvent(USER_ID, event.id);
      cancelEventRegistration(USER_ID, event.id);
      const reg = getUserRegistration(USER_ID, event.id);
      expect(reg!.status).toBe('cancelled');
      expect(reg!.cancelledAt).not.toBeNull();
    });

    it('取消不存在的报名抛 NOT_FOUND', () => {
      const event = createEvent(ADMIN_ID, makeValidInput());
      expect(() => cancelEventRegistration(USER_ID, event.id)).toThrow();
    });

    it('重复取消抛 ALREADY_CANCELLED', () => {
      const event = createEvent(ADMIN_ID, makeValidInput({ capacity: 10 }));
      registerEvent(USER_ID, event.id);
      cancelEventRegistration(USER_ID, event.id);
      expect(() => cancelEventRegistration(USER_ID, event.id)).toThrow();
    });
  });

  describe('getEventRegistrations', () => {
    it('返回活动的所有报名记录', () => {
      const event = createEvent(ADMIN_ID, makeValidInput({ capacity: 10 }));
      registerEvent(USER_ID, event.id);
      registerEvent(USER_ID_2, event.id);
      const regs = getEventRegistrations(event.id);
      expect(regs).toHaveLength(2);
    });
  });

  describe('adminAddRegistration', () => {
    it('管理员为用户报名成功', () => {
      const event = createEvent(ADMIN_ID, makeValidInput({ capacity: 10 }));
      const result = adminAddRegistration(ADMIN_ID, USER_ID, event.id);
      expect(result.ok).toBe(true);
      expect(result.registration!.status).toBe('registered');
    });

    it('用户已报名时抛 ALREADY_REGISTERED', () => {
      const event = createEvent(ADMIN_ID, makeValidInput({ capacity: 10 }));
      registerEvent(USER_ID, event.id);
      expect(() => adminAddRegistration(ADMIN_ID, USER_ID, event.id)).toThrow();
    });

    it('容量满时抛 FULL', () => {
      const event = createEvent(ADMIN_ID, makeValidInput({ capacity: 1 }));
      registerEvent(USER_ID, event.id);
      expect(() => adminAddRegistration(ADMIN_ID, USER_ID_2, event.id)).toThrow();
    });
  });

  describe('adminUpdateRegistrationStatus', () => {
    it('更新报名状态为 waitlisted', () => {
      const event = createEvent(ADMIN_ID, makeValidInput({ capacity: 10 }));
      registerEvent(USER_ID, event.id);
      const reg = getUserRegistration(USER_ID, event.id);
      adminUpdateRegistrationStatus(ADMIN_ID, reg!.id, 'waitlisted');
      const updated = getUserRegistration(USER_ID, event.id);
      expect(updated!.status).toBe('waitlisted');
    });

    it('更新为 cancelled 时设置 cancelledAt', () => {
      const event = createEvent(ADMIN_ID, makeValidInput({ capacity: 10 }));
      registerEvent(USER_ID, event.id);
      const reg = getUserRegistration(USER_ID, event.id);
      adminUpdateRegistrationStatus(ADMIN_ID, reg!.id, 'cancelled');
      const updated = getUserRegistration(USER_ID, event.id);
      expect(updated!.status).toBe('cancelled');
      expect(updated!.cancelledAt).not.toBeNull();
    });

    it('报名记录不存在时抛 NOT_FOUND', () => {
      expect(() =>
        adminUpdateRegistrationStatus(ADMIN_ID, 'fake-id', 'cancelled'),
      ).toThrow();
    });
  });

  describe('getEventRegistrationStats', () => {
    it('正确统计各状态人数', () => {
      const event = createEvent(ADMIN_ID, makeValidInput({ capacity: 10 }));
      registerEvent(USER_ID, event.id);
      registerEvent(USER_ID_2, event.id);
      cancelEventRegistration(USER_ID_2, event.id);
      const stats = getEventRegistrationStats(event.id);
      expect(stats.total).toBe(2);
      expect(stats.registered).toBe(1);
      expect(stats.cancelled).toBe(1);
      expect(stats.waitlisted).toBe(0);
    });
  });

  describe('getUserRegisteredEvents', () => {
    it('返回用户已报名的活动列表', () => {
      const event1 = createEvent(ADMIN_ID, makeValidInput({ title: 'E1', capacity: 10 }));
      const event2 = createEvent(ADMIN_ID, makeValidInput({ title: 'E2', capacity: 10 }));
      registerEvent(USER_ID, event1.id);
      registerEvent(USER_ID, event2.id);
      cancelEventRegistration(USER_ID, event2.id);
      const events = getUserRegisteredEvents(USER_ID);
      expect(events).toHaveLength(1);
      expect(events[0].title).toBe('E1');
    });
  });

  describe('getRegisteredCount', () => {
    it('只统计 registered 状态', () => {
      const event = createEvent(ADMIN_ID, makeValidInput({ capacity: 10 }));
      registerEvent(USER_ID, event.id);
      registerEvent(USER_ID_2, event.id);
      cancelEventRegistration(USER_ID_2, event.id);
      expect(getRegisteredCount(event.id)).toBe(1);
    });
  });
});
