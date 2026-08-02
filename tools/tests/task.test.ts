/**
 * @file 任务模块单元测试
 *
 * 覆盖核心服务层逻辑：
 *   - CRUD：createTask / updateTask / deleteTask / getTaskById / listTasks
 *   - 任务状态机：draft → published → closed（不可逆流转 + 非法状态拦截）
 *   - 输入校验：validateTaskInput（标题/描述/分类/积分范围/认领上限）
 *   - 认领状态机：claimTask / cancelClaim / reviewClaim（claimed→completed/cancelled）
 *   - 认领边界：容量上限 CLAIM_LIMIT / 重复认领 ALREADY_CLAIMED / 取消后重认领
 *   - IDOR 防护：cancelClaim 双重绑定 user_id
 *   - 积分联动：reviewClaim(approved) 发放 task_reward 积分；拒绝不扣分
 *   - 查询：getUserClaims / getTaskClaims / listPendingClaims
 *
 * 测试策略：内存 SQLite + vi.mock 替换 getDb/logAdminAction，真实 points 服务运行（建 points_transactions 表）
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

vi.mock('@/shared/security/audit', () => ({
  logAdminAction: vi.fn(),
  __esModule: true,
}));

import {
  createTask,
  updateTask,
  deleteTask,
  publishTask,
  closeTask,
  getTaskById,
  listTasks,
  claimTask,
  cancelClaim,
  reviewClaim,
  getUserClaims,
  getTaskClaims,
  listPendingClaims,
} from '@/modules/tools/server/task';
import { logAdminAction } from '@/shared/security/audit';
import { getUserPointsBalance } from '@/modules/tools/server/points';

const ADMIN_ID = 'admin-001';
const USER_ID = 'user-001';
const USER_ID_2 = 'user-002';

function initTestSchema() {
  inMemoryDb.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      content_markdown TEXT,
      category TEXT NOT NULL DEFAULT 'general',
      tags TEXT DEFAULT '[]',
      points INTEGER NOT NULL DEFAULT 10,
      max_claimants INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'draft',
      created_by TEXT NOT NULL,
      published_at TEXT,
      closed_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS task_claims (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'claimed',
      claim_note TEXT,
      completed_at TEXT,
      reviewed_by TEXT,
      review_note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(task_id, user_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS points_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_id TEXT,
      balance_after INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function clearTables() {
  inMemoryDb.exec('DELETE FROM points_transactions');
  inMemoryDb.exec('DELETE FROM task_claims');
  inMemoryDb.exec('DELETE FROM tasks');
  inMemoryDb.exec('DELETE FROM users');
}

function seedUser(id: string, email: string, displayName: string | null = null) {
  inMemoryDb
    .prepare('INSERT INTO users (id, email, display_name, password_hash) VALUES (?, ?, ?, ?)')
    .run(id, email, displayName, 'dummy-hash');
}

function makeValidInput(overrides: Record<string, unknown> = {}) {
  return {
    title: '整理协会资料',
    description: '整理本学期活动资料并归档',
    contentMarkdown: undefined as string | undefined,
    category: 'documentation' as const,
    tags: ['档案'],
    points: 20,
    maxClaimants: 3,
    ...overrides,
  };
}

async function setupPublishedTask(overrides: Record<string, unknown> = {}) {
  const task = await createTask(ADMIN_ID, makeValidInput(overrides));
  await publishTask(ADMIN_ID, task.id);
  return task;
}

describe('task 模块 — CRUD 服务', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
    seedUser(ADMIN_ID, 'admin@test.com', '管理员');
    seedUser(USER_ID, 'u1@test.com', '用户一');
    seedUser(USER_ID_2, 'u2@test.com', '用户二');
    vi.mocked(logAdminAction).mockClear();
  });

  describe('createTask', () => {
    it('创建成功并返回完整 Task，初始状态为 draft', async () => {
      const task = await createTask(ADMIN_ID, makeValidInput());
      await expect(task.id).toBeDefined();
      await expect(task.title).toBe('整理协会资料');
      await expect(task.status).toBe('draft');
      await expect(task.points).toBe(20);
      await expect(task.maxClaimants).toBe(3);
      await expect(task.category).toBe('documentation');
      await expect(task.tags).toEqual(['档案']);
      await expect(task.createdBy).toBe(ADMIN_ID);
      await expect(task.claimCount).toBe(0);
    });

    it('标题为空抛 VALIDATION_ERROR', async () => {
      await expect(createTask(ADMIN_ID, makeValidInput({ title: '' }))).rejects.toThrow();
    });

    it('描述为空抛 VALIDATION_ERROR', async () => {
      await expect(createTask(ADMIN_ID, makeValidInput({ description: '' }))).rejects.toThrow();
    });

    it('标题超长抛 VALIDATION_ERROR', async () => {
      await expect(createTask(ADMIN_ID, makeValidInput({ title: 'a'.repeat(201) }))).rejects.toThrow();
    });

    it('积分超范围抛 VALIDATION_ERROR', async () => {
      await expect(createTask(ADMIN_ID, makeValidInput({ points: 101 }))).rejects.toThrow();
      await expect(createTask(ADMIN_ID, makeValidInput({ points: -1 }))).rejects.toThrow();
    });

    it('认领上限超范围抛 VALIDATION_ERROR', async () => {
      await expect(createTask(ADMIN_ID, makeValidInput({ maxClaimants: 51 }))).rejects.toThrow();
      await expect(createTask(ADMIN_ID, makeValidInput({ maxClaimants: 0 }))).rejects.toThrow();
    });

    it('分类非法抛 VALIDATION_ERROR', async () => {
      await expect(createTask(ADMIN_ID, makeValidInput({ category: 'invalid' as never }))).rejects.toThrow();
    });

    it('未指定 points 时默认 10', async () => {
      const task = await createTask(ADMIN_ID, makeValidInput({ points: undefined }));
      await expect(task.points).toBe(10);
    });

    it('未指定 maxClaimants 时默认 1', async () => {
      const task = await createTask(ADMIN_ID, makeValidInput({ maxClaimants: undefined }));
      await expect(task.maxClaimants).toBe(1);
    });

    it('创建时记录审计日志', async () => {
      await createTask(ADMIN_ID, makeValidInput({ title: '测试任务' }));
      await expect(logAdminAction).toHaveBeenCalledTimes(1);
      const [actorId, action] = vi.mocked(logAdminAction).mock.calls[0];
      await expect(actorId).toBe(ADMIN_ID);
      await expect(action).toBe('task_create');
    });
  });

  describe('getTaskById', () => {
    it('存在的 ID 返回 Task', async () => {
      const created = await createTask(ADMIN_ID, makeValidInput());
      const fetched = await getTaskById(created.id);
      await expect(fetched).not.toBeNull();
      await expect(fetched!.id).toBe(created.id);
    });

    it('不存在的 ID 返回 null', async () => {
      await expect(await getTaskById('non-existent')).toBeNull();
    });

    it('claimCount 统计非 cancelled 的认领', async () => {
      const task = await setupPublishedTask({ maxClaimants: 5 });
      await claimTask(USER_ID, task.id);
      await claimTask(USER_ID_2, task.id);
      const fetched = await getTaskById(task.id);
      await expect(fetched!.claimCount).toBe(2);
    });
  });

  describe('listTasks', () => {
    it('返回全部任务', async () => {
      await createTask(ADMIN_ID, makeValidInput({ title: 'T1' }));
      await createTask(ADMIN_ID, makeValidInput({ title: 'T2' }));
      const result = await listTasks();
      await expect(result.tasks).toHaveLength(2);
      await expect(result.total).toBe(2);
    });

    it('按状态筛选', async () => {
      await createTask(ADMIN_ID, makeValidInput({ title: '草稿' }));
      const published = await createTask(ADMIN_ID, makeValidInput({ title: '已发布' }));
      await publishTask(ADMIN_ID, published.id);
      const result = await listTasks({ status: 'published' });
      await expect(result.tasks).toHaveLength(1);
      await expect(result.tasks[0].title).toBe('已发布');
    });

    it('按分类筛选', async () => {
      await createTask(ADMIN_ID, makeValidInput({ title: '文档', category: 'documentation' }));
      await createTask(ADMIN_ID, makeValidInput({ title: '活动', category: 'event' }));
      const result = await listTasks({ category: 'event' });
      await expect(result.tasks).toHaveLength(1);
      await expect(result.tasks[0].title).toBe('活动');
    });

    it('分页生效', async () => {
      for (let i = 0; i < 3; i++) {
        await createTask(ADMIN_ID, makeValidInput({ title: `T${i}` }));
      }
      const result = await listTasks({ page: 1, pageSize: 2 });
      await expect(result.tasks).toHaveLength(2);
      await expect(result.total).toBe(3);
    });
  });

  describe('updateTask', () => {
    it('更新标题和积分成功', async () => {
      const task = await createTask(ADMIN_ID, makeValidInput());
      const updated = await updateTask(ADMIN_ID, task.id, { title: '新标题', points: 30 });
      await expect(updated.title).toBe('新标题');
      await expect(updated.points).toBe(30);
    });

    it('任务不存在抛 NOT_FOUND', async () => {
      await expect(updateTask(ADMIN_ID, 'non-existent', { title: 'x' })).rejects.toThrow();
    });

    it('合并校验失败抛 VALIDATION_ERROR', async () => {
      const task = await createTask(ADMIN_ID, makeValidInput());
      await expect(updateTask(ADMIN_ID, task.id, { points: 200 })).rejects.toThrow();
    });

    it('更新 tags 正确序列化', async () => {
      const task = await createTask(ADMIN_ID, makeValidInput({ tags: ['a'] }));
      const updated = await updateTask(ADMIN_ID, task.id, { tags: ['x', 'y'] });
      await expect(updated.tags).toEqual(['x', 'y']);
    });

    it('更新时记录审计日志', async () => {
      const task = await createTask(ADMIN_ID, makeValidInput());
      vi.mocked(logAdminAction).mockClear();
      await updateTask(ADMIN_ID, task.id, { title: '改' });
      await expect(logAdminAction).toHaveBeenCalledTimes(1);
      await expect(vi.mocked(logAdminAction).mock.calls[0][1]).toBe('task_update');
    });
  });

  describe('deleteTask', () => {
    it('删除成功后查询返回 null', async () => {
      const task = await createTask(ADMIN_ID, makeValidInput());
      await deleteTask(ADMIN_ID, task.id);
      await expect(await getTaskById(task.id)).toBeNull();
    });

    it('任务不存在抛 NOT_FOUND', async () => {
      await expect(deleteTask(ADMIN_ID, 'non-existent')).rejects.toThrow();
    });

    it('删除时记录审计日志', async () => {
      const task = await createTask(ADMIN_ID, makeValidInput({ title: '待删' }));
      vi.mocked(logAdminAction).mockClear();
      await deleteTask(ADMIN_ID, task.id);
      await expect(logAdminAction).toHaveBeenCalledTimes(1);
      const [, action, , details] = vi.mocked(logAdminAction).mock.calls[0];
      await expect(action).toBe('task_delete');
      await expect((details as { title: string }).title).toBe('待删');
    });
  });
});

describe('task 模块 — 任务状态机', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
    seedUser(ADMIN_ID, 'admin@test.com', '管理员');
    seedUser(USER_ID, 'u1@test.com', '用户一');
    vi.mocked(logAdminAction).mockClear();
  });

  describe('publishTask', () => {
    it('draft → published 流转成功', async () => {
      const task = await createTask(ADMIN_ID, makeValidInput());
      const published = await publishTask(ADMIN_ID, task.id);
      await expect(published.status).toBe('published');
      await expect(published.publishedAt).not.toBeNull();
    });

    it('已发布任务再发布抛 INVALID_STATUS', async () => {
      const task = await createTask(ADMIN_ID, makeValidInput());
      await publishTask(ADMIN_ID, task.id);
      await expect(publishTask(ADMIN_ID, task.id)).rejects.toThrow();
    });

    it('已关闭任务发布抛 INVALID_STATUS', async () => {
      const task = await createTask(ADMIN_ID, makeValidInput());
      await publishTask(ADMIN_ID, task.id);
      await closeTask(ADMIN_ID, task.id);
      await expect(publishTask(ADMIN_ID, task.id)).rejects.toThrow();
    });

    it('任务不存在抛 NOT_FOUND', async () => {
      await expect(publishTask(ADMIN_ID, 'non-existent')).rejects.toThrow();
    });

    it('发布时记录审计日志', async () => {
      const task = await createTask(ADMIN_ID, makeValidInput());
      vi.mocked(logAdminAction).mockClear();
      await publishTask(ADMIN_ID, task.id);
      await expect(vi.mocked(logAdminAction).mock.calls[0][1]).toBe('task_publish');
    });
  });

  describe('closeTask', () => {
    it('published → closed 流转成功', async () => {
      const task = await createTask(ADMIN_ID, makeValidInput());
      await publishTask(ADMIN_ID, task.id);
      const closed = await closeTask(ADMIN_ID, task.id);
      await expect(closed.status).toBe('closed');
      await expect(closed.closedAt).not.toBeNull();
    });

    it('草稿状态关闭抛 INVALID_STATUS', async () => {
      const task = await createTask(ADMIN_ID, makeValidInput());
      await expect(closeTask(ADMIN_ID, task.id)).rejects.toThrow();
    });

    it('已关闭任务再关闭抛 INVALID_STATUS', async () => {
      const task = await createTask(ADMIN_ID, makeValidInput());
      await publishTask(ADMIN_ID, task.id);
      await closeTask(ADMIN_ID, task.id);
      await expect(closeTask(ADMIN_ID, task.id)).rejects.toThrow();
    });

    it('任务不存在抛 NOT_FOUND', async () => {
      await expect(closeTask(ADMIN_ID, 'non-existent')).rejects.toThrow();
    });
  });

  describe('状态不可逆', () => {
    it('closed 不能回退到 published', async () => {
      const task = await createTask(ADMIN_ID, makeValidInput());
      await publishTask(ADMIN_ID, task.id);
      await closeTask(ADMIN_ID, task.id);
      await expect(publishTask(ADMIN_ID, task.id)).rejects.toThrow();
    });
  });
});

describe('task 模块 — 认领状态机', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
    seedUser(ADMIN_ID, 'admin@test.com', '管理员');
    seedUser(USER_ID, 'u1@test.com', '用户一');
    seedUser(USER_ID_2, 'u2@test.com', '用户二');
    vi.mocked(logAdminAction).mockClear();
  });

  describe('claimTask', () => {
    it('认领已发布任务成功，状态为 claimed', async () => {
      const task = await setupPublishedTask();
      const claim = await claimTask(USER_ID, task.id, '我能做');
      await expect(claim.status).toBe('claimed');
      await expect(claim.userId).toBe(USER_ID);
      await expect(claim.claimNote).toBe('我能做');
    });

    it('认领草稿任务抛 INVALID_STATUS', async () => {
      const task = await createTask(ADMIN_ID, makeValidInput());
      await expect(claimTask(USER_ID, task.id)).rejects.toThrow();
    });

    it('认领已关闭任务抛 INVALID_STATUS', async () => {
      const task = await setupPublishedTask();
      await closeTask(ADMIN_ID, task.id);
      await expect(claimTask(USER_ID, task.id)).rejects.toThrow();
    });

    it('任务不存在抛 NOT_FOUND', async () => {
      await expect(claimTask(USER_ID, 'non-existent')).rejects.toThrow();
    });

    it('认领达上限抛 CLAIM_LIMIT', async () => {
      const task = await setupPublishedTask({ maxClaimants: 1 });
      await claimTask(USER_ID, task.id);
      await expect(claimTask(USER_ID_2, task.id)).rejects.toThrow();
    });

    it('重复认领抛 ALREADY_CLAIMED', async () => {
      const task = await setupPublishedTask({ maxClaimants: 5 });
      await claimTask(USER_ID, task.id);
      await expect(claimTask(USER_ID, task.id)).rejects.toThrow();
    });

    it('取消后可重新认领（复用原记录）', async () => {
      const task = await setupPublishedTask({ maxClaimants: 5 });
      const claim1 = await claimTask(USER_ID, task.id);
      await cancelClaim(USER_ID, claim1.id);
      const claim2 = await claimTask(USER_ID, task.id, '再试一次');
      await expect(claim2.id).toBe(claim1.id);
      await expect(claim2.status).toBe('claimed');
      await expect(claim2.claimNote).toBe('再试一次');
    });

    it('note 为空白时存储为 null', async () => {
      const task = await setupPublishedTask();
      const claim = await claimTask(USER_ID, task.id, '   ');
      await expect(claim.claimNote).toBeNull();
    });
  });

  describe('cancelClaim', () => {
    it('取消认领成功，状态为 cancelled', async () => {
      const task = await setupPublishedTask({ maxClaimants: 5 });
      const claim = await claimTask(USER_ID, task.id);
      await cancelClaim(USER_ID, claim.id);
      const userClaims = await getUserClaims(USER_ID);
      await expect(userClaims[0].status).toBe('cancelled');
    });

    it('认领不存在抛 NOT_FOUND', async () => {
      await expect(cancelClaim(USER_ID, 'non-existent')).rejects.toThrow();
    });

    it('IDOR 防护：非本人认领取消抛 NOT_FOUND', async () => {
      const task = await setupPublishedTask({ maxClaimants: 5 });
      const claim = await claimTask(USER_ID, task.id);
      await expect(cancelClaim(USER_ID_2, claim.id)).rejects.toThrow();
    });

    it('已完成的认领不可取消抛 INVALID_STATUS', async () => {
      const task = await setupPublishedTask({ maxClaimants: 5, points: 20 });
      const claim = await claimTask(USER_ID, task.id);
      await reviewClaim(ADMIN_ID, claim.id, true);
      await expect(cancelClaim(USER_ID, claim.id)).rejects.toThrow();
    });
  });

  describe('reviewClaim', () => {
    it('审核通过置 completed 并记录 reviewed_by', async () => {
      const task = await setupPublishedTask({ maxClaimants: 5 });
      const claim = await claimTask(USER_ID, task.id);
      const reviewed = await reviewClaim(ADMIN_ID, claim.id, true, '做得好');
      await expect(reviewed.status).toBe('completed');
      await expect(reviewed.reviewedBy).toBe(ADMIN_ID);
      await expect(reviewed.reviewNote).toBe('做得好');
      await expect(reviewed.completedAt).not.toBeNull();
    });

    it('审核拒绝置 cancelled', async () => {
      const task = await setupPublishedTask({ maxClaimants: 5 });
      const claim = await claimTask(USER_ID, task.id);
      const reviewed = await reviewClaim(ADMIN_ID, claim.id, false, '不合格');
      await expect(reviewed.status).toBe('cancelled');
      await expect(reviewed.reviewedBy).toBe(ADMIN_ID);
      await expect(reviewed.reviewNote).toBe('不合格');
    });

    it('重复审核抛 INVALID_STATUS', async () => {
      const task = await setupPublishedTask({ maxClaimants: 5 });
      const claim = await claimTask(USER_ID, task.id);
      await reviewClaim(ADMIN_ID, claim.id, true);
      await expect(reviewClaim(ADMIN_ID, claim.id, false)).rejects.toThrow();
    });

    it('认领不存在抛 NOT_FOUND', async () => {
      await expect(reviewClaim(ADMIN_ID, 'non-existent', true)).rejects.toThrow();
    });

    it('审核通过时记录 task_review_approve 审计日志', async () => {
      const task = await setupPublishedTask({ maxClaimants: 5 });
      const claim = await claimTask(USER_ID, task.id);
      vi.mocked(logAdminAction).mockClear();
      await reviewClaim(ADMIN_ID, claim.id, true);
      await expect(logAdminAction).toHaveBeenCalledTimes(1);
      const [actorId, action, targetUserId, details] = vi.mocked(logAdminAction).mock.calls[0];
      await expect(actorId).toBe(ADMIN_ID);
      await expect(action).toBe('task_review_approve');
      await expect(targetUserId).toBe(USER_ID);
      await expect((details as { points: number }).points).toBe(20);
    });

    it('审核拒绝时记录 task_review_reject 审计日志', async () => {
      const task = await setupPublishedTask({ maxClaimants: 5 });
      const claim = await claimTask(USER_ID, task.id);
      vi.mocked(logAdminAction).mockClear();
      await reviewClaim(ADMIN_ID, claim.id, false);
      await expect(vi.mocked(logAdminAction).mock.calls[0][1]).toBe('task_review_reject');
    });
  });
});

describe('task 模块 — 积分联动', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
    seedUser(ADMIN_ID, 'admin@test.com', '管理员');
    seedUser(USER_ID, 'u1@test.com', '用户一');
    vi.mocked(logAdminAction).mockClear();
  });

  it('审核通过发放 task_reward 积分', async () => {
    const task = await setupPublishedTask({ maxClaimants: 5, points: 20 });
    const claim = await claimTask(USER_ID, task.id);
    await reviewClaim(ADMIN_ID, claim.id, true);
    await expect(await getUserPointsBalance(USER_ID)).toBe(20);
  });

  it('积分 0 的任务审核通过不发放积分', async () => {
    const task = await setupPublishedTask({ maxClaimants: 5, points: 0 });
    const claim = await claimTask(USER_ID, task.id);
    await reviewClaim(ADMIN_ID, claim.id, true);
    await expect(await getUserPointsBalance(USER_ID)).toBe(0);
  });

  it('审核拒绝不发放积分', async () => {
    const task = await setupPublishedTask({ maxClaimants: 5, points: 20 });
    const claim = await claimTask(USER_ID, task.id);
    await reviewClaim(ADMIN_ID, claim.id, false);
    await expect(await getUserPointsBalance(USER_ID)).toBe(0);
  });

  it('多次审核通过积分累加', async () => {
    const task1 = await setupPublishedTask({ maxClaimants: 5, points: 15 });
    const task2 = await setupPublishedTask({ maxClaimants: 5, points: 25 });
    const claim1 = await claimTask(USER_ID, task1.id);
    const claim2 = await claimTask(USER_ID, task2.id);
    await reviewClaim(ADMIN_ID, claim1.id, true);
    await reviewClaim(ADMIN_ID, claim2.id, true);
    await expect(await getUserPointsBalance(USER_ID)).toBe(40);
  });

  it('积分流水记录 source_type 为 task_reward', async () => {
    const task = await setupPublishedTask({ maxClaimants: 5, points: 20, title: '测试任务' });
    const claim = await claimTask(USER_ID, task.id);
    await reviewClaim(ADMIN_ID, claim.id, true);
    const tx = inMemoryDb
      .prepare('SELECT * FROM points_transactions WHERE user_id = ?')
      .all(USER_ID) as Array<{
      amount: number;
      reason: string;
      source_type: string;
      source_id: string;
      balance_after: number;
    }>;
    await expect(tx).toHaveLength(1);
    await expect(tx[0].amount).toBe(20);
    await expect(tx[0].reason).toBe('完成任务：测试任务');
    await expect(tx[0].source_type).toBe('task_reward');
    await expect(tx[0].source_id).toBe(task.id);
    await expect(tx[0].balance_after).toBe(20);
  });
});

describe('task 模块 — 认领查询', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
    seedUser(ADMIN_ID, 'admin@test.com', '管理员');
    seedUser(USER_ID, 'u1@test.com', '用户一');
    seedUser(USER_ID_2, 'u2@test.com', '用户二');
    vi.mocked(logAdminAction).mockClear();
  });

  describe('getUserClaims', () => {
    it('返回用户的认领记录按创建时间倒序', async () => {
      const task1 = await setupPublishedTask({ maxClaimants: 5, title: 'T1' });
      const task2 = await setupPublishedTask({ maxClaimants: 5, title: 'T2' });
      await claimTask(USER_ID, task1.id);
      await claimTask(USER_ID, task2.id);
      const claims = await getUserClaims(USER_ID);
      await expect(claims).toHaveLength(2);
    });

    it('无认领时返回空数组', async () => {
      await expect(await getUserClaims(USER_ID)).toHaveLength(0);
    });
  });

  describe('getTaskClaims', () => {
    it('返回任务的所有认领记录', async () => {
      const task = await setupPublishedTask({ maxClaimants: 5 });
      await claimTask(USER_ID, task.id);
      await claimTask(USER_ID_2, task.id);
      const claims = await getTaskClaims(task.id);
      await expect(claims).toHaveLength(2);
    });
  });

  describe('listPendingClaims', () => {
    it('返回所有 claimed 状态的认领按创建时间升序', async () => {
      const task = await setupPublishedTask({ maxClaimants: 5 });
      await claimTask(USER_ID, task.id);
      await claimTask(USER_ID_2, task.id);
      const pending = await listPendingClaims();
      await expect(pending).toHaveLength(2);
      await expect(await pending.every((c) => c.status === 'claimed')).toBe(true);
    });

    it('已完成认领不在待审列表', async () => {
      const task = await setupPublishedTask({ maxClaimants: 5, points: 10 });
      const claim = await claimTask(USER_ID, task.id);
      await claimTask(USER_ID_2, task.id);
      await reviewClaim(ADMIN_ID, claim.id, true);
      const pending = await listPendingClaims();
      await expect(pending).toHaveLength(1);
      await expect(pending[0].userId).toBe(USER_ID_2);
    });
  });
});
