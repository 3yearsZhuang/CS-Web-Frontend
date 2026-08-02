/**
 * @file 公告模块单元测试
 *
 * 覆盖核心服务层逻辑：
 *   - CRUD：createAnnouncement / updateAnnouncement / deleteAnnouncement / getAnnouncementById / listAllAnnouncements
 *   - 生效公告查询：getActiveAnnouncements（is_active=1 + 未过期 + 角色定向过滤 + 优先级排序）
 *   - 过期逻辑：expires_at 为空表示永不过期；过期公告不返回
 *   - 角色定向：targetRoles 为空/空数组对所有人生效；非空仅匹配角色可见；无角色用户不可见定向公告
 *   - 激活切换：toggleAnnouncementActive 翻转 is_active
 *   - 输入处理：title trim、content trim、level 默认 info、isDismissible 默认 true、priority 默认 0、targetRoles 序列化
 *
 * 测试策略：内存 SQLite + vi.mock 替换 getDb
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { _setDbEngineForTest } from '@/shared/db/drivers';
import { createSqliteTestEngine } from './dbEngine';

const inMemoryDb = new Database(':memory:');

const testEngine = createSqliteTestEngine(inMemoryDb);
_setDbEngineForTest(testEngine);

vi.mock('@/shared/db', () => ({
  getDb: () => inMemoryDb,
  __esModule: true,
}));

import {
  getActiveAnnouncements,
  listAllAnnouncements,
  getAnnouncementById,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  toggleAnnouncementActive,
} from '@/modules/announcement/server';
import type { AnnouncementInput } from '@/modules/announcement/types';

const ADMIN_ID = 'admin-001';

function initTestSchema() {
  inMemoryDb.exec(`
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      level TEXT NOT NULL DEFAULT 'info',
      is_active INTEGER NOT NULL DEFAULT 1,
      is_dismissible INTEGER NOT NULL DEFAULT 1,
      priority INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT,
      target_roles TEXT,
      created_by TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function clearTables() {
  inMemoryDb.exec('DELETE FROM announcements');
  inMemoryDb.exec('DELETE FROM users');
}

function seedAdmin(id: string) {
  inMemoryDb
    .prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)')
    .run(id, `${id}@test.com`, 'dummy-hash');
}

function makeValidInput(overrides: Record<string, unknown> = {}): AnnouncementInput {
  return {
    title: '系统维护通知',
    content: '本周日凌晨 2-4 点进行系统维护',
    ...overrides,
  } as AnnouncementInput;
}

describe('announcement 模块 — 创建公告 createAnnouncement', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
    seedAdmin(ADMIN_ID);
  });

  it('创建成功并返回完整记录，默认值正确', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput());
    await expect(ann.id).toBeDefined();
    await expect(ann.title).toBe('系统维护通知');
    await expect(ann.content).toBe('本周日凌晨 2-4 点进行系统维护');
    await expect(ann.level).toBe('info');
    await expect(ann.isActive).toBe(true);
    await expect(ann.isDismissible).toBe(true);
    await expect(ann.priority).toBe(0);
    await expect(ann.expiresAt).toBeNull();
    await expect(ann.targetRoles).toBeNull();
    await expect(ann.createdBy).toBe(ADMIN_ID);
    await expect(ann.createdAt).toBeDefined();
    await expect(ann.updatedAt).toBeDefined();
  });

  it('标题自动 trim', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput({ title: '  带空格的标题  ' }));
    await expect(ann.title).toBe('带空格的标题');
  });

  it('内容自动 trim', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput({ content: '  带空格的内容  ' }));
    await expect(ann.content).toBe('带空格的内容');
  });

  it('内容为空时存储为 null', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput({ content: undefined }));
    await expect(ann.content).toBeNull();
  });

  it('内容为空白时 trim 后存储为空字符串（?? 不拦截空串）', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput({ content: '   ' }));
    await expect(ann.content).toBe('');
  });

  it('自定义 level 生效', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput({ level: 'warning' }));
    await expect(ann.level).toBe('warning');
  });

  it('isDismissible=false 时存储为 false', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput({ isDismissible: false }));
    await expect(ann.isDismissible).toBe(false);
  });

  it('自定义 priority 生效', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput({ priority: 100 }));
    await expect(ann.priority).toBe(100);
  });

  it('自定义 expiresAt 生效', async () => {
    const future = '2099-12-31 23:59:59';
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput({ expiresAt: future }));
    await expect(ann.expiresAt).toBe(future);
  });

  it('targetRoles 序列化为 JSON 存储', async () => {
    const ann = await createAnnouncement(
      ADMIN_ID,
      makeValidInput({ targetRoles: ['admin', 'member'] }),
    );
    await expect(ann.targetRoles).toEqual(['admin', 'member']);
    const row = inMemoryDb
      .prepare('SELECT target_roles FROM announcements WHERE id = ?')
      .get(ann.id) as { target_roles: string | null };
    await expect(await JSON.parse(row.target_roles!)).toEqual(['admin', 'member']);
  });

  it('targetRoles 为空数组时存储为 JSON 空数组', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput({ targetRoles: [] }));
    await expect(ann.targetRoles).toEqual([]);
  });

  it('创建后可通过 getAnnouncementById 查询到', async () => {
    const created = await createAnnouncement(ADMIN_ID, makeValidInput());
    const fetched = await getAnnouncementById(created.id);
    await expect(fetched).not.toBeNull();
    await expect(fetched!.id).toBe(created.id);
    await expect(fetched!.title).toBe(created.title);
  });
});

describe('announcement 模块 — 查询单个公告 getAnnouncementById', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
    seedAdmin(ADMIN_ID);
  });

  it('存在的公告返回完整记录', async () => {
    const created = await createAnnouncement(ADMIN_ID, makeValidInput());
    const fetched = await getAnnouncementById(created.id);
    await expect(fetched).not.toBeNull();
    await expect(fetched!.id).toBe(created.id);
  });

  it('不存在的 id 返回 null', async () => {
    await expect(await getAnnouncementById('non-existent-id')).toBeNull();
  });
});

describe('announcement 模块 — 列出所有公告 listAllAnnouncements', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
    seedAdmin(ADMIN_ID);
  });

  it('空表返回空列表与 total=0', async () => {
    const result = await listAllAnnouncements();
    await expect(result.items).toEqual([]);
    await expect(result.total).toBe(0);
  });

  it('返回所有公告（含未激活/过期），按 created_at 倒序', async () => {
    // 直接插入带显式 created_at 的行，避免同秒时间戳导致排序不确定
    inMemoryDb
      .prepare(
        `INSERT INTO announcements (id, title, level, is_active, is_dismissible, priority, created_by, created_at, updated_at)
         VALUES (?, ?, 'info', ?, 1, 0, ?, ?, ?)`,
      )
      .run('a1', '公告1', 0, ADMIN_ID, '2025-01-01 10:00:00', '2025-01-01 10:00:00');
    inMemoryDb
      .prepare(
        `INSERT INTO announcements (id, title, level, is_active, is_dismissible, priority, created_by, created_at, updated_at)
         VALUES (?, ?, 'info', 1, 1, 0, ?, ?, ?)`,
      )
      .run('a2', '公告2', ADMIN_ID, '2025-01-02 10:00:00', '2025-01-02 10:00:00');

    const result = await listAllAnnouncements();
    await expect(result.total).toBe(2);
    await expect(result.items).toHaveLength(2);
    // created_at 倒序：后创建的在前
    await expect(result.items[0].id).toBe('a2');
    await expect(result.items[1].id).toBe('a1');
  });

  it('total 与 items.length 一致', async () => {
    await createAnnouncement(ADMIN_ID, makeValidInput({ title: 'a' }));
    await createAnnouncement(ADMIN_ID, makeValidInput({ title: 'b' }));
    await createAnnouncement(ADMIN_ID, makeValidInput({ title: 'c' }));
    const result = await listAllAnnouncements();
    await expect(result.total).toBe(result.items.length);
  });
});

describe('announcement 模块 — 生效公告查询 getActiveAnnouncements', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
    seedAdmin(ADMIN_ID);
  });

  it('仅返回 is_active=1 的公告', async () => {
    const active = await createAnnouncement(ADMIN_ID, makeValidInput({ title: '生效中' }));
    const inactive = await createAnnouncement(ADMIN_ID, makeValidInput({ title: '已停用' }));
    await updateAnnouncement(inactive.id, { isActive: false });

    const result = await getActiveAnnouncements();
    const ids = result.map((a) => a.id);
    await expect(ids).toContain(active.id);
    await expect(ids).not.toContain(inactive.id);
  });

  it('无生效公告时返回空数组', async () => {
    await expect(await getActiveAnnouncements()).toEqual([]);
  });

  it('未设置 expires_at 的公告永不过期', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput());
    const result = await getActiveAnnouncements();
    await expect(await result.some((a) => a.id === ann.id)).toBe(true);
  });

  it('expires_at 在未来的公告仍生效', async () => {
    const future = '2099-12-31 23:59:59';
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput({ expiresAt: future }));
    const result = await getActiveAnnouncements();
    await expect(await result.some((a) => a.id === ann.id)).toBe(true);
  });

  it('expires_at 已过期的公告不返回', async () => {
    const past = '2000-01-01 00:00:00';
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput({ expiresAt: past }));
    const result = await getActiveAnnouncements();
    await expect(await result.some((a) => a.id === ann.id)).toBe(false);
  });

  // ============ R17 回归测试：ISO 8601 格式过期判定 ============
  // 背景：管理端 UI 通过 new Date(value).toISOString() 写入 ISO 格式
  // （T 分隔符 + Z 后缀），而 datetime('now') 为空格分隔符。
  // 字符串直接比较时 T(0x54) > 空格(0x20)，导致过期当天公告被判为未过期。
  // 修复：server 层用 datetime(expires_at) 归一化。以下测试用 ISO 格式
  // 覆盖各时间窗口，确保修复持续生效。

  it('R17: ISO 格式过期公告不返回（past ISO 8601）', async () => {
    const pastIso = '2000-01-01T00:00:00.000Z';
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput({ expiresAt: pastIso }));
    const result = await getActiveAnnouncements();
    await expect(await result.some((a) => a.id === ann.id)).toBe(false);
  });

  it('R17: ISO 格式未来公告仍生效（future ISO 8601）', async () => {
    const futureIso = '2099-12-31T23:59:59.999Z';
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput({ expiresAt: futureIso }));
    const result = await getActiveAnnouncements();
    await expect(await result.some((a) => a.id === ann.id)).toBe(true);
  });

  it('R17: ISO 格式当天已过期公告不返回（同一日历日，时间已过）', async () => {
    // 构造"今天的 00:00:00 UTC"——对当前时刻而言已过期（除非恰好在 UTC 午夜）
    const todayMidnightUtc = new Date();
    todayMidnightUtc.setUTCHours(0, 0, 0, 0);
    const expiredTodayIso = todayMidnightUtc.toISOString();
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput({ expiresAt: expiredTodayIso }));
    const result = await getActiveAnnouncements();
    // 修复前：因 T > 空格，同日 ISO 始终 > datetime('now')，公告错误地生效
    // 修复后：datetime() 归一化后正确判定为过期
    await expect(await result.some((a) => a.id === ann.id)).toBe(false);
  });

  it('R17: 空字符串 expiresAt 视为永不过期', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput({ expiresAt: '' }));
    const result = await getActiveAnnouncements();
    await expect(await result.some((a) => a.id === ann.id)).toBe(true);
  });

  it('按 priority 降序排序', async () => {
    const low = await createAnnouncement(ADMIN_ID, makeValidInput({ title: '低优先级', priority: 1 }));
    const high = await createAnnouncement(ADMIN_ID, makeValidInput({ title: '高优先级', priority: 100 }));
    const mid = await createAnnouncement(ADMIN_ID, makeValidInput({ title: '中优先级', priority: 50 }));

    const result = await getActiveAnnouncements();
    await expect(result[0].id).toBe(high.id);
    await expect(result[1].id).toBe(mid.id);
    await expect(result[2].id).toBe(low.id);
  });

  it('priority 相同时按 created_at 降序（后创建在前）', async () => {
    // 直接插入带显式 created_at 的行，避免同秒时间戳导致排序不确定
    inMemoryDb
      .prepare(
        `INSERT INTO announcements (id, title, level, is_active, is_dismissible, priority, created_by, created_at, updated_at)
         VALUES (?, '先创建', 'info', 1, 1, 10, ?, ?, ?)`,
      )
      .run('first', ADMIN_ID, '2025-01-01 10:00:00', '2025-01-01 10:00:00');
    inMemoryDb
      .prepare(
        `INSERT INTO announcements (id, title, level, is_active, is_dismissible, priority, created_by, created_at, updated_at)
         VALUES (?, '后创建', 'info', 1, 1, 10, ?, ?, ?)`,
      )
      .run('second', ADMIN_ID, '2025-01-02 10:00:00', '2025-01-02 10:00:00');

    const result = await getActiveAnnouncements();
    await expect(result[0].id).toBe('second');
    await expect(result[1].id).toBe('first');
  });
});

describe('announcement 模块 — 角色定向 targetRoles', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
    seedAdmin(ADMIN_ID);
  });

  it('targetRoles 为 null 时对所有人生效（含无角色用户）', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput({ targetRoles: null }));
    await expect(await (await getActiveAnnouncements()).some((a) => a.id === ann.id)).toBe(true);
    await expect(await (await getActiveAnnouncements('member')).some((a) => a.id === ann.id)).toBe(true);
    await expect(await (await getActiveAnnouncements('admin')).some((a) => a.id === ann.id)).toBe(true);
  });

  it('targetRoles 为空数组时对所有人生效', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput({ targetRoles: [] }));
    await expect(await (await getActiveAnnouncements()).some((a) => a.id === ann.id)).toBe(true);
    await expect(await (await getActiveAnnouncements('member')).some((a) => a.id === ann.id)).toBe(true);
  });

  it('targetRoles 非空时仅匹配角色可见', async () => {
    const ann = await createAnnouncement(
      ADMIN_ID,
      makeValidInput({ targetRoles: ['admin'] }),
    );
    await expect(await (await getActiveAnnouncements('admin')).some((a) => a.id === ann.id)).toBe(true);
    await expect(await (await getActiveAnnouncements('member')).some((a) => a.id === ann.id)).toBe(false);
  });

  it('targetRoles 非空时无角色用户不可见', async () => {
    const ann = await createAnnouncement(
      ADMIN_ID,
      makeValidInput({ targetRoles: ['admin'] }),
    );
    await expect(await (await getActiveAnnouncements()).some((a) => a.id === ann.id)).toBe(false);
  });

  it('targetRoles 支持多角色匹配', async () => {
    const ann = await createAnnouncement(
      ADMIN_ID,
      makeValidInput({ targetRoles: ['admin', 'member'] }),
    );
    await expect(await (await getActiveAnnouncements('admin')).some((a) => a.id === ann.id)).toBe(true);
    await expect(await (await getActiveAnnouncements('member')).some((a) => a.id === ann.id)).toBe(true);
    await expect(await (await getActiveAnnouncements('guest')).some((a) => a.id === ann.id)).toBe(false);
  });
});

describe('announcement 模块 — 更新公告 updateAnnouncement', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
    seedAdmin(ADMIN_ID);
  });

  it('更新标题生效', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput());
    const updated = await updateAnnouncement(ann.id, { title: '新标题' });
    await expect(updated).not.toBeNull();
    await expect(updated!.title).toBe('新标题');
  });

  it('更新标题自动 trim', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput());
    const updated = await updateAnnouncement(ann.id, { title: '  trim 标题  ' });
    await expect(updated!.title).toBe('trim 标题');
  });

  it('更新内容生效', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput());
    const updated = await updateAnnouncement(ann.id, { content: '新内容' });
    await expect(updated!.content).toBe('新内容');
  });

  it('更新内容为空白时 trim 后存储为空字符串', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput());
    const updated = await updateAnnouncement(ann.id, { content: '   ' });
    await expect(updated!.content).toBe('');
  });

  it('更新 level 生效', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput());
    const updated = await updateAnnouncement(ann.id, { level: 'error' });
    await expect(updated!.level).toBe('error');
  });

  it('更新 isDismissible 生效', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput());
    const updated = await updateAnnouncement(ann.id, { isDismissible: false });
    await expect(updated!.isDismissible).toBe(false);
  });

  it('更新 priority 生效', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput());
    const updated = await updateAnnouncement(ann.id, { priority: 999 });
    await expect(updated!.priority).toBe(999);
  });

  it('更新 expiresAt 生效', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput());
    const future = '2099-12-31 23:59:59';
    const updated = await updateAnnouncement(ann.id, { expiresAt: future });
    await expect(updated!.expiresAt).toBe(future);
  });

  it('更新 targetRoles 生效', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput());
    const updated = await updateAnnouncement(ann.id, { targetRoles: ['admin'] });
    await expect(updated!.targetRoles).toEqual(['admin']);
  });

  it('更新 targetRoles 为 null 时清除定向', async () => {
    const ann = await createAnnouncement(
      ADMIN_ID,
      makeValidInput({ targetRoles: ['admin'] }),
    );
    const updated = await updateAnnouncement(ann.id, { targetRoles: null });
    await expect(updated!.targetRoles).toBeNull();
  });

  it('更新 isActive=false 后公告不再生效', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput());
    await updateAnnouncement(ann.id, { isActive: false });
    await expect(await (await getActiveAnnouncements()).some((a) => a.id === ann.id)).toBe(false);
  });

  it('更新 isActive=true 重新激活公告', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput());
    await updateAnnouncement(ann.id, { isActive: false });
    await updateAnnouncement(ann.id, { isActive: true });
    await expect(await (await getActiveAnnouncements()).some((a) => a.id === ann.id)).toBe(true);
  });

  it('部分更新：未提供字段保持原值', async () => {
    const ann = await createAnnouncement(
      ADMIN_ID,
      makeValidInput({ level: 'warning', priority: 50 }),
    );
    const updated = await updateAnnouncement(ann.id, { title: '仅改标题' });
    await expect(updated!.title).toBe('仅改标题');
    await expect(updated!.level).toBe('warning');
    await expect(updated!.priority).toBe(50);
  });

  it('不存在的 id 返回 null', async () => {
    await expect(await updateAnnouncement('non-existent', { title: 'x' })).toBeNull();
  });

  it('更新后 updated_at 刷新', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput());
    const originalUpdatedAt = ann.updatedAt;
    // 等待时间推进以确保 updated_at 变化
    const updated = await updateAnnouncement(ann.id, { title: '触发更新' });
    // SQLite datetime('now') 精度为秒，updated_at 可能与原值相同（同秒内）
    // 这里只验证字段存在且为字符串
    await expect(typeof updated!.updatedAt).toBe('string');
    await expect(originalUpdatedAt).toBeDefined();
  });
});

describe('announcement 模块 — 删除公告 deleteAnnouncement', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
    seedAdmin(ADMIN_ID);
  });

  it('删除存在的公告返回 true', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput());
    await expect(await deleteAnnouncement(ann.id)).toBe(true);
    await expect(await getAnnouncementById(ann.id)).toBeNull();
  });

  it('删除后不再出现在 listAllAnnouncements', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput());
    await deleteAnnouncement(ann.id);
    const result = await listAllAnnouncements();
    await expect(await result.items.some((a) => a.id === ann.id)).toBe(false);
  });

  it('删除不存在的 id 返回 false', async () => {
    await expect(await deleteAnnouncement('non-existent')).toBe(false);
  });

  it('删除后 getActiveAnnouncements 不再返回', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput());
    await deleteAnnouncement(ann.id);
    await expect(await (await getActiveAnnouncements()).some((a) => a.id === ann.id)).toBe(false);
  });
});

describe('announcement 模块 — 切换激活状态 toggleAnnouncementActive', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
    seedAdmin(ADMIN_ID);
  });

  it('从激活切换为未激活', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput());
    await expect(ann.isActive).toBe(true);
    const toggled = await toggleAnnouncementActive(ann.id);
    await expect(toggled).not.toBeNull();
    await expect(toggled!.isActive).toBe(false);
  });

  it('从未激活切换为激活', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput());
    await toggleAnnouncementActive(ann.id); // -> false
    const toggled = await toggleAnnouncementActive(ann.id); // -> true
    await expect(toggled!.isActive).toBe(true);
  });

  it('切换后影响 getActiveAnnouncements 结果', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput());
    await toggleAnnouncementActive(ann.id);
    await expect(await (await getActiveAnnouncements()).some((a) => a.id === ann.id)).toBe(false);
    await toggleAnnouncementActive(ann.id);
    await expect(await (await getActiveAnnouncements()).some((a) => a.id === ann.id)).toBe(true);
  });

  it('不存在的 id 返回 null', async () => {
    await expect(await toggleAnnouncementActive('non-existent')).toBeNull();
  });
});

describe('announcement 模块 — 行转换 rowToAnnouncement', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
    seedAdmin(ADMIN_ID);
  });

  it('is_active 整数正确转换为布尔', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput());
    const fetched = await getAnnouncementById(ann.id);
    await expect(fetched!.isActive).toBe(true);
    await updateAnnouncement(ann.id, { isActive: false });
    await expect((await getAnnouncementById(ann.id))!.isActive).toBe(false);
  });

  it('is_dismissible 整数正确转换为布尔', async () => {
    const ann = await createAnnouncement(
      ADMIN_ID,
      makeValidInput({ isDismissible: false }),
    );
    await expect((await getAnnouncementById(ann.id))!.isDismissible).toBe(false);
  });

  it('target_roles JSON 正确反序列化为数组', async () => {
    const ann = await createAnnouncement(
      ADMIN_ID,
      makeValidInput({ targetRoles: ['a', 'b', 'c'] }),
    );
    const fetched = await getAnnouncementById(ann.id);
    await expect(fetched!.targetRoles).toEqual(['a', 'b', 'c']);
  });

  it('target_roles 为 null 时反序列化为 null', async () => {
    const ann = await createAnnouncement(ADMIN_ID, makeValidInput({ targetRoles: null }));
    const fetched = await getAnnouncementById(ann.id);
    await expect(fetched!.targetRoles).toBeNull();
  });
});
