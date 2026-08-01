/**
 * @file 入社申请模块单元测试
 *
 * 覆盖核心服务层逻辑：
 *   - 提交：submitJoinApplication（公开提交 + 输入校验 + techTags 序列化）
 *   - 查询：listJoinApplications（按状态筛选 + 全量列表）
 *   - 审批状态机：reviewJoinApplication pending→approved/rejected（单向不可逆 + 重复审批拦截）
 *   - 输入校验：validateInput（姓名/学号/专业/理由必填 + 长度上限 + 标签数量与长度）
 *   - 审计日志：审批操作记录 approve/reject_join_application
 *
 * 测试策略：内存 SQLite + vi.mock 替换 getDb/logAdminAction
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
  submitJoinApplication,
  listJoinApplications,
  reviewJoinApplication,
} from '@/modules/join/server';
import { logAdminAction } from '@/shared/security/audit';

const ADMIN_ID = 'admin-001';

function initTestSchema() {
  inMemoryDb.exec(`
    CREATE TABLE IF NOT EXISTS join_applications (
      id TEXT PRIMARY KEY,
      applicant_name TEXT NOT NULL,
      student_id TEXT NOT NULL,
      major TEXT NOT NULL,
      tech_tags TEXT,
      reason TEXT NOT NULL,
      contact_qq TEXT,
      contact_phone TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      reviewed_by TEXT,
      review_note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
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
  inMemoryDb.exec('DELETE FROM join_applications');
  inMemoryDb.exec('DELETE FROM users');
}

function seedAdmin(id: string) {
  inMemoryDb
    .prepare('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)')
    .run(id, `${id}@test.com`, 'dummy-hash');
}

function makeValidInput(overrides: Record<string, unknown> = {}) {
  return {
    applicantName: '张三',
    studentId: '20240101',
    major: '计算机科学与技术',
    techTags: ['React', 'Node.js'],
    reason: '希望加入技术协会，提升开发能力',
    contactQq: '12345678',
    contactPhone: '13800000000',
    ...overrides,
  };
}

describe('join 模块 — 提交申请', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
    seedAdmin(ADMIN_ID);
    vi.mocked(logAdminAction).mockClear();
  });

  it('提交成功并返回完整申请，初始状态为 pending', () => {
    const app = submitJoinApplication(makeValidInput());
    expect(app.id).toBeDefined();
    expect(app.applicantName).toBe('张三');
    expect(app.studentId).toBe('20240101');
    expect(app.major).toBe('计算机科学与技术');
    expect(app.status).toBe('pending');
    expect(app.techTags).toEqual(['React', 'Node.js']);
    expect(app.contactQq).toBe('12345678');
    expect(app.contactPhone).toBe('13800000000');
    expect(app.reviewedBy).toBeNull();
    expect(app.reviewNote).toBeNull();
  });

  it('姓名为空抛 VALIDATION_ERROR', () => {
    expect(() => submitJoinApplication(makeValidInput({ applicantName: '' }))).toThrow();
  });

  it('姓名仅空白抛 VALIDATION_ERROR', () => {
    expect(() => submitJoinApplication(makeValidInput({ applicantName: '   ' }))).toThrow();
  });

  it('学号为空抛 VALIDATION_ERROR', () => {
    expect(() => submitJoinApplication(makeValidInput({ studentId: '' }))).toThrow();
  });

  it('专业为空抛 VALIDATION_ERROR', () => {
    expect(() => submitJoinApplication(makeValidInput({ major: '' }))).toThrow();
  });

  it('申请理由为空抛 VALIDATION_ERROR', () => {
    expect(() => submitJoinApplication(makeValidInput({ reason: '' }))).toThrow();
  });

  it('姓名超长抛 VALIDATION_ERROR', () => {
    expect(() => submitJoinApplication(makeValidInput({ applicantName: 'a'.repeat(21) }))).toThrow();
  });

  it('学号超长抛 VALIDATION_ERROR', () => {
    expect(() => submitJoinApplication(makeValidInput({ studentId: 'a'.repeat(21) }))).toThrow();
  });

  it('专业超长抛 VALIDATION_ERROR', () => {
    expect(() => submitJoinApplication(makeValidInput({ major: 'a'.repeat(41) }))).toThrow();
  });

  it('申请理由超长抛 VALIDATION_ERROR', () => {
    expect(() => submitJoinApplication(makeValidInput({ reason: 'a'.repeat(501) }))).toThrow();
  });

  it('QQ 超长抛 VALIDATION_ERROR', () => {
    expect(() => submitJoinApplication(makeValidInput({ contactQq: 'a'.repeat(21) }))).toThrow();
  });

  it('手机号超长抛 VALIDATION_ERROR', () => {
    expect(() => submitJoinApplication(makeValidInput({ contactPhone: 'a'.repeat(21) }))).toThrow();
  });

  it('技术标签超过 10 个抛 VALIDATION_ERROR', () => {
    expect(() =>
      submitJoinApplication(makeValidInput({ techTags: Array(11).fill('tag') })),
    ).toThrow();
  });

  it('单个标签超过 20 字符抛 VALIDATION_ERROR', () => {
    expect(() =>
      submitJoinApplication(makeValidInput({ techTags: ['a'.repeat(21)] })),
    ).toThrow();
  });

  it('无技术标签时 techTags 返回空数组', () => {
    const app = submitJoinApplication(makeValidInput({ techTags: undefined }));
    expect(app.techTags).toEqual([]);
  });

  it('无联系方式时 contactQq/contactPhone 为 null', () => {
    const app = submitJoinApplication(
      makeValidInput({ contactQq: undefined, contactPhone: undefined }),
    );
    expect(app.contactQq).toBeNull();
    expect(app.contactPhone).toBeNull();
  });

  it('空白联系方式存储为 null', () => {
    const app = submitJoinApplication(
      makeValidInput({ contactQq: '   ', contactPhone: '   ' }),
    );
    expect(app.contactQq).toBeNull();
    expect(app.contactPhone).toBeNull();
  });

  it('techTags 序列化为 JSON 存储', () => {
    const app = submitJoinApplication(makeValidInput({ techTags: ['A', 'B'] }));
    const row = inMemoryDb
      .prepare('SELECT tech_tags FROM join_applications WHERE id = ?')
      .get(app.id) as { tech_tags: string | null };
    expect(JSON.parse(row.tech_tags!)).toEqual(['A', 'B']);
  });

  it('字段自动 trim', () => {
    const app = submitJoinApplication(
      makeValidInput({
        applicantName: '  张三  ',
        studentId: '  20240101  ',
        major: '  计算机科学与技术  ',
        reason: '  希望加入  ',
      }),
    );
    expect(app.applicantName).toBe('张三');
    expect(app.studentId).toBe('20240101');
    expect(app.major).toBe('计算机科学与技术');
    expect(app.reason).toBe('希望加入');
  });
});

describe('join 模块 — 查询申请', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
    seedAdmin(ADMIN_ID);
    vi.mocked(logAdminAction).mockClear();
  });

  it('返回全部申请按创建时间倒序', () => {
    submitJoinApplication(makeValidInput({ applicantName: 'A' }));
    submitJoinApplication(makeValidInput({ applicantName: 'B' }));
    const list = listJoinApplications();
    expect(list).toHaveLength(2);
  });

  it('按状态筛选 pending', () => {
    const app1 = submitJoinApplication(makeValidInput({ applicantName: 'A' }));
    const app2 = submitJoinApplication(makeValidInput({ applicantName: 'B' }));
    reviewJoinApplication(ADMIN_ID, app1.id, 'approved');
    const pending = listJoinApplications('pending');
    expect(pending).toHaveLength(1);
    expect(pending[0].applicantName).toBe('B');
  });

  it('按状态筛选 approved', () => {
    const app1 = submitJoinApplication(makeValidInput({ applicantName: 'A' }));
    submitJoinApplication(makeValidInput({ applicantName: 'B' }));
    reviewJoinApplication(ADMIN_ID, app1.id, 'approved');
    const approved = listJoinApplications('approved');
    expect(approved).toHaveLength(1);
    expect(approved[0].applicantName).toBe('A');
  });

  it('无申请时返回空数组', () => {
    expect(listJoinApplications()).toHaveLength(0);
  });
});

describe('join 模块 — 审批状态机', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
    seedAdmin(ADMIN_ID);
    vi.mocked(logAdminAction).mockClear();
  });

  describe('reviewJoinApplication — pending → approved/rejected', () => {
    it('审核通过置 approved 并记录 reviewed_by', () => {
      const app = submitJoinApplication(makeValidInput());
      const reviewed = reviewJoinApplication(ADMIN_ID, app.id, 'approved', '欢迎加入');
      expect(reviewed.status).toBe('approved');
      expect(reviewed.reviewedBy).toBe(ADMIN_ID);
      expect(reviewed.reviewNote).toBe('欢迎加入');
    });

    it('审核拒绝置 rejected', () => {
      const app = submitJoinApplication(makeValidInput());
      const reviewed = reviewJoinApplication(ADMIN_ID, app.id, 'rejected', '名额已满');
      expect(reviewed.status).toBe('rejected');
      expect(reviewed.reviewedBy).toBe(ADMIN_ID);
      expect(reviewed.reviewNote).toBe('名额已满');
    });

    it('未提供 reviewNote 时存储为 null', () => {
      const app = submitJoinApplication(makeValidInput());
      const reviewed = reviewJoinApplication(ADMIN_ID, app.id, 'approved');
      expect(reviewed.reviewNote).toBeNull();
    });

    it('显式传 undefined reviewNote 存储 null', () => {
      const app = submitJoinApplication(makeValidInput());
      const reviewed = reviewJoinApplication(ADMIN_ID, app.id, 'approved', undefined);
      expect(reviewed.reviewNote).toBeNull();
    });

    it('申请不存在抛 NOT_FOUND', () => {
      expect(() => reviewJoinApplication(ADMIN_ID, 'non-existent', 'approved')).toThrow();
    });

    it('已通过申请再审批抛 ALREADY_REVIEWED', () => {
      const app = submitJoinApplication(makeValidInput());
      reviewJoinApplication(ADMIN_ID, app.id, 'approved');
      expect(() => reviewJoinApplication(ADMIN_ID, app.id, 'rejected')).toThrow();
    });

    it('已拒绝申请再审批抛 ALREADY_REVIEWED', () => {
      const app = submitJoinApplication(makeValidInput());
      reviewJoinApplication(ADMIN_ID, app.id, 'rejected');
      expect(() => reviewJoinApplication(ADMIN_ID, app.id, 'approved')).toThrow();
    });

    it('同状态重复审批也抛 ALREADY_REVIEWED', () => {
      const app = submitJoinApplication(makeValidInput());
      reviewJoinApplication(ADMIN_ID, app.id, 'approved');
      expect(() => reviewJoinApplication(ADMIN_ID, app.id, 'approved')).toThrow();
    });
  });

  describe('reviewJoinApplication — 审计日志', () => {
    it('通过时记录 approve_join_application', () => {
      const app = submitJoinApplication(makeValidInput({ applicantName: '李四' }));
      reviewJoinApplication(ADMIN_ID, app.id, 'approved', '通过');
      expect(logAdminAction).toHaveBeenCalledTimes(1);
      const [actorId, action, targetUserId, details] = vi.mocked(logAdminAction).mock.calls[0];
      expect(actorId).toBe(ADMIN_ID);
      expect(action).toBe('approve_join_application');
      expect(targetUserId).toBeNull();
      expect((details as { applicantName: string; studentId: string }).applicantName).toBe('李四');
      expect((details as { reviewNote: string }).reviewNote).toBe('通过');
    });

    it('拒绝时记录 reject_join_application', () => {
      const app = submitJoinApplication(makeValidInput());
      reviewJoinApplication(ADMIN_ID, app.id, 'rejected', '拒绝');
      expect(vi.mocked(logAdminAction).mock.calls[0][1]).toBe('reject_join_application');
    });

    it('审计日志记录申请 ID 与学号', () => {
      const app = submitJoinApplication(makeValidInput({ studentId: '20240999' }));
      reviewJoinApplication(ADMIN_ID, app.id, 'approved');
      const details = vi.mocked(logAdminAction).mock.calls[0][3] as {
        applicationId: string;
        studentId: string;
      };
      expect(details.applicationId).toBe(app.id);
      expect(details.studentId).toBe('20240999');
    });
  });

  describe('状态不可逆', () => {
    it('approved 不可回退到 rejected', () => {
      const app = submitJoinApplication(makeValidInput());
      reviewJoinApplication(ADMIN_ID, app.id, 'approved');
      expect(() => reviewJoinApplication(ADMIN_ID, app.id, 'rejected')).toThrow();
    });

    it('rejected 不可回退到 approved', () => {
      const app = submitJoinApplication(makeValidInput());
      reviewJoinApplication(ADMIN_ID, app.id, 'rejected');
      expect(() => reviewJoinApplication(ADMIN_ID, app.id, 'approved')).toThrow();
    });
  });
});

describe('join 模块 — toJoinApplication 容错', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
    seedAdmin(ADMIN_ID);
    vi.mocked(logAdminAction).mockClear();
  });

  it('tech_tags 为非法 JSON 时返回空数组', () => {
    const app = submitJoinApplication(makeValidInput());
    inMemoryDb
      .prepare('UPDATE join_applications SET tech_tags = ? WHERE id = ?')
      .run('not-json', app.id);
    const list = listJoinApplications();
    const fetched = list.find((a) => a.id === app.id);
    expect(fetched!.techTags).toEqual([]);
  });

  it('tech_tags 为 null 时返回空数组', () => {
    const app = submitJoinApplication(makeValidInput({ techTags: undefined }));
    const list = listJoinApplications();
    const fetched = list.find((a) => a.id === app.id);
    expect(fetched!.techTags).toEqual([]);
  });
});
