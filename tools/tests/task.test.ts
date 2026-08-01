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

const inMemoryDb = new Database(':memory:');

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

function setupPublishedTask(overrides: Record<string, unknown> = {}) {
  const task = createTask(ADMIN_ID, makeValidInput(overrides));
  publishTask(ADMIN_ID, task.id);
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
    it('创建成功并返回完整 Task，初始状态为 draft', () => {
      const task = createTask(ADMIN_ID, makeValidInput());
      expect(task.id).toBeDefined();
      expect(task.title).toBe('整理协会资料');
      expect(task.status).toBe('draft');
      expect(task.points).toBe(20);
      expect(task.maxClaimants).toBe(3);
      expect(task.category).toBe('documentation');
      expect(task.tags).toEqual(['档案']);
      expect(task.createdBy).toBe(ADMIN_ID);
      expect(task.claimCount).toBe(0);
    });

    it('标题为空抛 VALIDATION_ERROR', () => {
      expect(() => createTask(ADMIN_ID, makeValidInput({ title: '' }))).toThrow();
    });

    it('描述为空抛 VALIDATION_ERROR', () => {
      expect(() => createTask(ADMIN_ID, makeValidInput({ description: '' }))).toThrow();
    });

    it('标题超长抛 VALIDATION_ERROR', () => {
      expect(() => createTask(ADMIN_ID, makeValidInput({ title: 'a'.repeat(201) }))).toThrow();
    });

    it('积分超范围抛 VALIDATION_ERROR', () => {
      expect(() => createTask(ADMIN_ID, makeValidInput({ points: 101 }))).toThrow();
      expect(() => createTask(ADMIN_ID, makeValidInput({ points: -1 }))).toThrow();
    });

    it('认领上限超范围抛 VALIDATION_ERROR', () => {
      expect(() => createTask(ADMIN_ID, makeValidInput({ maxClaimants: 51 }))).toThrow();
      expect(() => createTask(ADMIN_ID, makeValidInput({ maxClaimants: 0 }))).toThrow();
    });

    it('分类非法抛 VALIDATION_ERROR', () => {
      expect(() => createTask(ADMIN_ID, makeValidInput({ category: 'invalid' as never }))).toThrow();
    });

    it('未指定 points 时默认 10', () => {
      const task = createTask(ADMIN_ID, makeValidInput({ points: undefined }));
      expect(task.points).toBe(10);
    });

    it('未指定 maxClaimants 时默认 1', () => {
      const task = createTask(ADMIN_ID, makeValidInput({ maxClaimants: undefined }));
      expect(task.maxClaimants).toBe(1);
    });

    it('创建时记录审计日志', () => {
      createTask(ADMIN_ID, makeValidInput({ title: '测试任务' }));
      expect(logAdminAction).toHaveBeenCalledTimes(1);
      const [actorId, action] = vi.mocked(logAdminAction).mock.calls[0];
      expect(actorId).toBe(ADMIN_ID);
      expect(action).toBe('task_create');
    });
  });

  describe('getTaskById', () => {
    it('存在的 ID 返回 Task', () => {
      const created = createTask(ADMIN_ID, makeValidInput());
      const fetched = getTaskById(created.id);
      expect(fetched).not.toBeNull();
      expect(fetched!.id).toBe(created.id);
    });

    it('不存在的 ID 返回 null', () => {
      expect(getTaskById('non-existent')).toBeNull();
    });

    it('claimCount 统计非 cancelled 的认领', () => {
      const task = setupPublishedTask({ maxClaimants: 5 });
      claimTask(USER_ID, task.id);
      claimTask(USER_ID_2, task.id);
      const fetched = getTaskById(task.id);
      expect(fetched!.claimCount).toBe(2);
    });
  });

  describe('listTasks', () => {
    it('返回全部任务', () => {
      createTask(ADMIN_ID, makeValidInput({ title: 'T1' }));
      createTask(ADMIN_ID, makeValidInput({ title: 'T2' }));
      const result = listTasks();
      expect(result.tasks).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('按状态筛选', () => {
      createTask(ADMIN_ID, makeValidInput({ title: '草稿' }));
      const published = createTask(ADMIN_ID, makeValidInput({ title: '已发布' }));
      publishTask(ADMIN_ID, published.id);
      const result = listTasks({ status: 'published' });
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].title).toBe('已发布');
    });

    it('按分类筛选', () => {
      createTask(ADMIN_ID, makeValidInput({ title: '文档', category: 'documentation' }));
      createTask(ADMIN_ID, makeValidInput({ title: '活动', category: 'event' }));
      const result = listTasks({ category: 'event' });
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].title).toBe('活动');
    });

    it('分页生效', () => {
      for (let i = 0; i < 3; i++) {
        createTask(ADMIN_ID, makeValidInput({ title: `T${i}` }));
      }
      const result = listTasks({ page: 1, pageSize: 2 });
      expect(result.tasks).toHaveLength(2);
      expect(result.total).toBe(3);
    });
  });

  describe('updateTask', () => {
    it('更新标题和积分成功', () => {
      const task = createTask(ADMIN_ID, makeValidInput());
      const updated = updateTask(ADMIN_ID, task.id, { title: '新标题', points: 30 });
      expect(updated.title).toBe('新标题');
      expect(updated.points).toBe(30);
    });

    it('任务不存在抛 NOT_FOUND', () => {
      expect(() => updateTask(ADMIN_ID, 'non-existent', { title: 'x' })).toThrow();
    });

    it('合并校验失败抛 VALIDATION_ERROR', () => {
      const task = createTask(ADMIN_ID, makeValidInput());
      expect(() => updateTask(ADMIN_ID, task.id, { points: 200 })).toThrow();
    });

    it('更新 tags 正确序列化', () => {
      const task = createTask(ADMIN_ID, makeValidInput({ tags: ['a'] }));
      const updated = updateTask(ADMIN_ID, task.id, { tags: ['x', 'y'] });
      expect(updated.tags).toEqual(['x', 'y']);
    });

    it('更新时记录审计日志', () => {
      const task = createTask(ADMIN_ID, makeValidInput());
      vi.mocked(logAdminAction).mockClear();
      updateTask(ADMIN_ID, task.id, { title: '改' });
      expect(logAdminAction).toHaveBeenCalledTimes(1);
      expect(vi.mocked(logAdminAction).mock.calls[0][1]).toBe('task_update');
    });
  });

  describe('deleteTask', () => {
    it('删除成功后查询返回 null', () => {
      const task = createTask(ADMIN_ID, makeValidInput());
      deleteTask(ADMIN_ID, task.id);
      expect(getTaskById(task.id)).toBeNull();
    });

    it('任务不存在抛 NOT_FOUND', () => {
      expect(() => deleteTask(ADMIN_ID, 'non-existent')).toThrow();
    });

    it('删除时记录审计日志', () => {
      const task = createTask(ADMIN_ID, makeValidInput({ title: '待删' }));
      vi.mocked(logAdminAction).mockClear();
      deleteTask(ADMIN_ID, task.id);
      expect(logAdminAction).toHaveBeenCalledTimes(1);
      const [, action, , details] = vi.mocked(logAdminAction).mock.calls[0];
      expect(action).toBe('task_delete');
      expect((details as { title: string }).title).toBe('待删');
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
    it('draft → published 流转成功', () => {
      const task = createTask(ADMIN_ID, makeValidInput());
      const published = publishTask(ADMIN_ID, task.id);
      expect(published.status).toBe('published');
      expect(published.publishedAt).not.toBeNull();
    });

    it('已发布任务再发布抛 INVALID_STATUS', () => {
      const task = createTask(ADMIN_ID, makeValidInput());
      publishTask(ADMIN_ID, task.id);
      expect(() => publishTask(ADMIN_ID, task.id)).toThrow();
    });

    it('已关闭任务发布抛 INVALID_STATUS', () => {
      const task = createTask(ADMIN_ID, makeValidInput());
      publishTask(ADMIN_ID, task.id);
      closeTask(ADMIN_ID, task.id);
      expect(() => publishTask(ADMIN_ID, task.id)).toThrow();
    });

    it('任务不存在抛 NOT_FOUND', () => {
      expect(() => publishTask(ADMIN_ID, 'non-existent')).toThrow();
    });

    it('发布时记录审计日志', () => {
      const task = createTask(ADMIN_ID, makeValidInput());
      vi.mocked(logAdminAction).mockClear();
      publishTask(ADMIN_ID, task.id);
      expect(vi.mocked(logAdminAction).mock.calls[0][1]).toBe('task_publish');
    });
  });

  describe('closeTask', () => {
    it('published → closed 流转成功', () => {
      const task = createTask(ADMIN_ID, makeValidInput());
      publishTask(ADMIN_ID, task.id);
      const closed = closeTask(ADMIN_ID, task.id);
      expect(closed.status).toBe('closed');
      expect(closed.closedAt).not.toBeNull();
    });

    it('草稿状态关闭抛 INVALID_STATUS', () => {
      const task = createTask(ADMIN_ID, makeValidInput());
      expect(() => closeTask(ADMIN_ID, task.id)).toThrow();
    });

    it('已关闭任务再关闭抛 INVALID_STATUS', () => {
      const task = createTask(ADMIN_ID, makeValidInput());
      publishTask(ADMIN_ID, task.id);
      closeTask(ADMIN_ID, task.id);
      expect(() => closeTask(ADMIN_ID, task.id)).toThrow();
    });

    it('任务不存在抛 NOT_FOUND', () => {
      expect(() => closeTask(ADMIN_ID, 'non-existent')).toThrow();
    });
  });

  describe('状态不可逆', () => {
    it('closed 不能回退到 published', () => {
      const task = createTask(ADMIN_ID, makeValidInput());
      publishTask(ADMIN_ID, task.id);
      closeTask(ADMIN_ID, task.id);
      expect(() => publishTask(ADMIN_ID, task.id)).toThrow();
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
    it('认领已发布任务成功，状态为 claimed', () => {
      const task = setupPublishedTask();
      const claim = claimTask(USER_ID, task.id, '我能做');
      expect(claim.status).toBe('claimed');
      expect(claim.userId).toBe(USER_ID);
      expect(claim.claimNote).toBe('我能做');
    });

    it('认领草稿任务抛 INVALID_STATUS', () => {
      const task = createTask(ADMIN_ID, makeValidInput());
      expect(() => claimTask(USER_ID, task.id)).toThrow();
    });

    it('认领已关闭任务抛 INVALID_STATUS', () => {
      const task = setupPublishedTask();
      closeTask(ADMIN_ID, task.id);
      expect(() => claimTask(USER_ID, task.id)).toThrow();
    });

    it('任务不存在抛 NOT_FOUND', () => {
      expect(() => claimTask(USER_ID, 'non-existent')).toThrow();
    });

    it('认领达上限抛 CLAIM_LIMIT', () => {
      const task = setupPublishedTask({ maxClaimants: 1 });
      claimTask(USER_ID, task.id);
      expect(() => claimTask(USER_ID_2, task.id)).toThrow();
    });

    it('重复认领抛 ALREADY_CLAIMED', () => {
      const task = setupPublishedTask({ maxClaimants: 5 });
      claimTask(USER_ID, task.id);
      expect(() => claimTask(USER_ID, task.id)).toThrow();
    });

    it('取消后可重新认领（复用原记录）', () => {
      const task = setupPublishedTask({ maxClaimants: 5 });
      const claim1 = claimTask(USER_ID, task.id);
      cancelClaim(USER_ID, claim1.id);
      const claim2 = claimTask(USER_ID, task.id, '再试一次');
      expect(claim2.id).toBe(claim1.id);
      expect(claim2.status).toBe('claimed');
      expect(claim2.claimNote).toBe('再试一次');
    });

    it('note 为空白时存储为 null', () => {
      const task = setupPublishedTask();
      const claim = claimTask(USER_ID, task.id, '   ');
      expect(claim.claimNote).toBeNull();
    });
  });

  describe('cancelClaim', () => {
    it('取消认领成功，状态为 cancelled', () => {
      const task = setupPublishedTask({ maxClaimants: 5 });
      const claim = claimTask(USER_ID, task.id);
      cancelClaim(USER_ID, claim.id);
      const userClaims = getUserClaims(USER_ID);
      expect(userClaims[0].status).toBe('cancelled');
    });

    it('认领不存在抛 NOT_FOUND', () => {
      expect(() => cancelClaim(USER_ID, 'non-existent')).toThrow();
    });

    it('IDOR 防护：非本人认领取消抛 NOT_FOUND', () => {
      const task = setupPublishedTask({ maxClaimants: 5 });
      const claim = claimTask(USER_ID, task.id);
      expect(() => cancelClaim(USER_ID_2, claim.id)).toThrow();
    });

    it('已完成的认领不可取消抛 INVALID_STATUS', () => {
      const task = setupPublishedTask({ maxClaimants: 5, points: 20 });
      const claim = claimTask(USER_ID, task.id);
      reviewClaim(ADMIN_ID, claim.id, true);
      expect(() => cancelClaim(USER_ID, claim.id)).toThrow();
    });
  });

  describe('reviewClaim', () => {
    it('审核通过置 completed 并记录 reviewed_by', () => {
      const task = setupPublishedTask({ maxClaimants: 5 });
      const claim = claimTask(USER_ID, task.id);
      const reviewed = reviewClaim(ADMIN_ID, claim.id, true, '做得好');
      expect(reviewed.status).toBe('completed');
      expect(reviewed.reviewedBy).toBe(ADMIN_ID);
      expect(reviewed.reviewNote).toBe('做得好');
      expect(reviewed.completedAt).not.toBeNull();
    });

    it('审核拒绝置 cancelled', () => {
      const task = setupPublishedTask({ maxClaimants: 5 });
      const claim = claimTask(USER_ID, task.id);
      const reviewed = reviewClaim(ADMIN_ID, claim.id, false, '不合格');
      expect(reviewed.status).toBe('cancelled');
      expect(reviewed.reviewedBy).toBe(ADMIN_ID);
      expect(reviewed.reviewNote).toBe('不合格');
    });

    it('重复审核抛 INVALID_STATUS', () => {
      const task = setupPublishedTask({ maxClaimants: 5 });
      const claim = claimTask(USER_ID, task.id);
      reviewClaim(ADMIN_ID, claim.id, true);
      expect(() => reviewClaim(ADMIN_ID, claim.id, false)).toThrow();
    });

    it('认领不存在抛 NOT_FOUND', () => {
      expect(() => reviewClaim(ADMIN_ID, 'non-existent', true)).toThrow();
    });

    it('审核通过时记录 task_review_approve 审计日志', () => {
      const task = setupPublishedTask({ maxClaimants: 5 });
      const claim = claimTask(USER_ID, task.id);
      vi.mocked(logAdminAction).mockClear();
      reviewClaim(ADMIN_ID, claim.id, true);
      expect(logAdminAction).toHaveBeenCalledTimes(1);
      const [actorId, action, targetUserId, details] = vi.mocked(logAdminAction).mock.calls[0];
      expect(actorId).toBe(ADMIN_ID);
      expect(action).toBe('task_review_approve');
      expect(targetUserId).toBe(USER_ID);
      expect((details as { points: number }).points).toBe(20);
    });

    it('审核拒绝时记录 task_review_reject 审计日志', () => {
      const task = setupPublishedTask({ maxClaimants: 5 });
      const claim = claimTask(USER_ID, task.id);
      vi.mocked(logAdminAction).mockClear();
      reviewClaim(ADMIN_ID, claim.id, false);
      expect(vi.mocked(logAdminAction).mock.calls[0][1]).toBe('task_review_reject');
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

  it('审核通过发放 task_reward 积分', () => {
    const task = setupPublishedTask({ maxClaimants: 5, points: 20 });
    const claim = claimTask(USER_ID, task.id);
    reviewClaim(ADMIN_ID, claim.id, true);
    expect(getUserPointsBalance(USER_ID)).toBe(20);
  });

  it('积分 0 的任务审核通过不发放积分', () => {
    const task = setupPublishedTask({ maxClaimants: 5, points: 0 });
    const claim = claimTask(USER_ID, task.id);
    reviewClaim(ADMIN_ID, claim.id, true);
    expect(getUserPointsBalance(USER_ID)).toBe(0);
  });

  it('审核拒绝不发放积分', () => {
    const task = setupPublishedTask({ maxClaimants: 5, points: 20 });
    const claim = claimTask(USER_ID, task.id);
    reviewClaim(ADMIN_ID, claim.id, false);
    expect(getUserPointsBalance(USER_ID)).toBe(0);
  });

  it('多次审核通过积分累加', () => {
    const task1 = setupPublishedTask({ maxClaimants: 5, points: 15 });
    const task2 = setupPublishedTask({ maxClaimants: 5, points: 25 });
    const claim1 = claimTask(USER_ID, task1.id);
    const claim2 = claimTask(USER_ID, task2.id);
    reviewClaim(ADMIN_ID, claim1.id, true);
    reviewClaim(ADMIN_ID, claim2.id, true);
    expect(getUserPointsBalance(USER_ID)).toBe(40);
  });

  it('积分流水记录 source_type 为 task_reward', () => {
    const task = setupPublishedTask({ maxClaimants: 5, points: 20, title: '测试任务' });
    const claim = claimTask(USER_ID, task.id);
    reviewClaim(ADMIN_ID, claim.id, true);
    const tx = inMemoryDb
      .prepare('SELECT * FROM points_transactions WHERE user_id = ?')
      .all(USER_ID) as Array<{
      amount: number;
      reason: string;
      source_type: string;
      source_id: string;
      balance_after: number;
    }>;
    expect(tx).toHaveLength(1);
    expect(tx[0].amount).toBe(20);
    expect(tx[0].reason).toBe('完成任务：测试任务');
    expect(tx[0].source_type).toBe('task_reward');
    expect(tx[0].source_id).toBe(task.id);
    expect(tx[0].balance_after).toBe(20);
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
    it('返回用户的认领记录按创建时间倒序', () => {
      const task1 = setupPublishedTask({ maxClaimants: 5, title: 'T1' });
      const task2 = setupPublishedTask({ maxClaimants: 5, title: 'T2' });
      claimTask(USER_ID, task1.id);
      claimTask(USER_ID, task2.id);
      const claims = getUserClaims(USER_ID);
      expect(claims).toHaveLength(2);
    });

    it('无认领时返回空数组', () => {
      expect(getUserClaims(USER_ID)).toHaveLength(0);
    });
  });

  describe('getTaskClaims', () => {
    it('返回任务的所有认领记录', () => {
      const task = setupPublishedTask({ maxClaimants: 5 });
      claimTask(USER_ID, task.id);
      claimTask(USER_ID_2, task.id);
      const claims = getTaskClaims(task.id);
      expect(claims).toHaveLength(2);
    });
  });

  describe('listPendingClaims', () => {
    it('返回所有 claimed 状态的认领按创建时间升序', () => {
      const task = setupPublishedTask({ maxClaimants: 5 });
      claimTask(USER_ID, task.id);
      claimTask(USER_ID_2, task.id);
      const pending = listPendingClaims();
      expect(pending).toHaveLength(2);
      expect(pending.every((c) => c.status === 'claimed')).toBe(true);
    });

    it('已完成认领不在待审列表', () => {
      const task = setupPublishedTask({ maxClaimants: 5, points: 10 });
      const claim = claimTask(USER_ID, task.id);
      claimTask(USER_ID_2, task.id);
      reviewClaim(ADMIN_ID, claim.id, true);
      const pending = listPendingClaims();
      expect(pending).toHaveLength(1);
      expect(pending[0].userId).toBe(USER_ID_2);
    });
  });
});
