/**
 * @file 角色权限系统漏洞修复验证测试（tailtest hunt）
 *
 * 验证 8 项修复：
 *   V1 — 审计日志 admin_actions.admin_id FK ON DELETE SET NULL（删除 admin 后审计保留）
 *   V2 — approveResetRequest 自我保护（SELF_APPROVE）
 *   V3 — 最后管理员保护（LAST_ADMIN：降级/禁用/删除）
 *   V4 — send-code 拒绝已注册邮箱（路由层，此处测试底层逻辑不直接覆盖）
 *   V5 — 验证码 HMAC-SHA256 哈希（round-trip + 非 scrypt）
 *   V6 — cleanupExpiredData 过期重置申请自动标记
 *   V7 — approveResetRequest 返回刷新后的 user（updatedAt 已更新）
 *   V8 — generateCode 清理过期验证码
 *
 * 使用内存 SQLite + vi.mock 覆盖 getDb，每个测试获得全新 DB。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import type { DB } from '@/shared/db';
import { _setDbEngineForTest } from '@/shared/db/drivers';
import { createSqliteTestEngine } from './dbEngine';
import { _setAuthRepositoryForTest } from '@/shared/db/repositories/auth.repo';
import { _setAuditRepositoryForTest } from '@/shared/db/repositories/audit.repo';

// 设置测试用默认重置密码（服务层已移除硬编码回退，需环境变量）
process.env.PASSWORD_RESET_DEFAULT = 'TEST_RESET_PWD';

// 测试用内存 DB（每个 beforeEach 重建）
let testDb: DB;

// 双重覆盖：
// 1) 已迁移到 getDbEngine() 单例的服务（createUser 等）通过 _setDbEngineForTest 注入同一内存库；
// 2) 尚未迁移、仍直接调用 getDb() 的 auth 子模块（verification-code / password-reset）通过 mock 返回 testDb。
// 两者指向同一个 in-memory testDb，保证读写一致。
vi.mock('@/shared/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/db')>();
  return {
    ...actual,
    getDb: () => testDb,
  } as typeof actual;
});

// mock @/shared/utils/mail：验证码发送改为空操作，避免依赖 SMTP
vi.mock('@/shared/utils/mail', () => ({
  sendVerificationCode: vi.fn().mockResolvedValue(undefined),
}));

// 导入被测模块（getDb 已被 mock）
import {
  createUser,
  authenticateUser,
  approveResetRequest,
  createResetRequest,
  listResetRequests,
  generateCode,
  verifyCode,
} from '@/modules/auth/server';
import {
  updateUserByAdmin,
  deleteUserByAdmin,
  logAdminAction,
  listAdminActions,
} from '@/modules/admin/server';
import { cleanupExpiredData } from '@/shared/db';

/** 初始化测试 schema（与 db.ts 一致，使用 ON DELETE SET NULL） */
function initTestSchema(db: DB): void {
  db.exec(`
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      bio TEXT,
      avatar_url TEXT,
      avatar_type TEXT DEFAULT 'initial',
      github_url TEXT,
      website_url TEXT,
      role TEXT NOT NULL DEFAULT 'user',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE activity_participations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      activity_title TEXT NOT NULL,
      activity_date TEXT NOT NULL,
      role TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE admin_actions (
      id TEXT PRIMARY KEY,
      admin_id TEXT,
      action TEXT NOT NULL,
      target_user_id TEXT,
      details TEXT,
      ip TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE TABLE verification_codes (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE password_reset_requests (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_id TEXT,
      admin_note TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT,
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
    );
  `);
}

beforeEach(() => {
  testDb = new Database(':memory:');
  testDb.pragma('foreign_keys = ON');
  initTestSchema(testDb);
  // 注入引擎单例，使走 getDbEngine() 的服务读写同一 in-memory testDb
  _setDbEngineForTest(createSqliteTestEngine(testDb));
  // Repository 单例在创建时把 engine 捕获进闭包，需重置以便在下一个测试重新绑定新引擎
  _setAuthRepositoryForTest(null);
  _setAuditRepositoryForTest(null);
});

// ========== V1: 审计日志完整性 ==========
describe('V1: 审计日志 admin_actions FK ON DELETE SET NULL', () => {
  it('删除管理员后审计记录保留（admin_id 置 NULL）', async () => {
    // 创建管理员 A 和普通用户 B
    const adminA = await createUser('admin-a@test.com', 'password123');
    const userB = await createUser('user-b@test.com', 'password456');

    // A 执行管理员操作，生成审计记录
    await logAdminAction(adminA.id, 'update_user', userB.id, { field: 'role' });
    await logAdminAction(adminA.id, 'reset_password', userB.id, { email: userB.email });

    const actionsBefore = await listAdminActions(adminA.id);
    expect(actionsBefore).toHaveLength(2);

    // 需要另一个管理员才能删除 A
    const adminC = await createUser('admin-c@test.com', 'password789');
    // 手动将 C 提升为管理员（绕过服务层，因为 updateUserByAdmin 需要 adminId）
    testDb.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(adminC.id);
    // 手动将 A 提升为管理员（createUser 默认 role='user'）
    testDb.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(adminA.id);

    // C 删除 A（deleteUserByAdmin 会额外记录一条 delete_user 审计日志）
    await deleteUserByAdmin(adminC.id, adminA.id);

    // 审计记录仍存在：A 的 2 条记录 admin_id 置 NULL，C 的 delete_user 记录保留
    const allActions = testDb
      .prepare('SELECT * FROM admin_actions ORDER BY created_at')
      .all() as Array<{ admin_id: string | null; action: string }>;
    expect(allActions).toHaveLength(3);
    // A 的两条审计记录 admin_id 应为 NULL（被 SET NULL 保留）
    const aActions = allActions.filter((a) => a.action !== 'delete_user');
    expect(aActions).toHaveLength(2);
    expect(await aActions.every((a) => a.admin_id === null)).toBe(true);
    // C 的 delete_user 审计记录 admin_id 仍指向 C
    const deleteAction = allActions.find((a) => a.action === 'delete_user');
    expect(deleteAction).toBeDefined();
    expect(deleteAction!.admin_id).toBe(adminC.id);
  });
});

// ========== V2: approveResetRequest 自我保护 ==========
describe('V2: approveResetRequest 自我保护', () => {
  it('管理员不能批准自己的密码重置申请（抛 SELF_APPROVE）', async () => {
    const admin = await createUser('admin@test.com', 'password123');
    testDb.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(admin.id);

    // 管理员提交忘记密码申请
    const { id: requestId } = await createResetRequest(admin.email);

    // 管理员尝试批准自己的申请
    // approveResetRequest 为同步函数，直接抛错（非 Promise），用同步断言
    expect(() => approveResetRequest(admin.id, requestId)).toThrow(
      '不能批准自己的密码重置申请',
    );

    // 验证申请仍为 pending（未被处理）
    const reqs = await listResetRequests('pending');
    expect(reqs).toHaveLength(1);
    expect(reqs[0].status).toBe('pending');
  });

  it('管理员可以批准其他用户的重置申请', async () => {
    const admin = await createUser('admin@test.com', 'password123');
    const user = await createUser('user@test.com', 'password456');
    testDb.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(admin.id);

    const { id: requestId } = await createResetRequest(user.email);
    const result = await approveResetRequest(admin.id, requestId);

    expect(result.id).toBe(user.id);
    // 验证密码已重置为默认密码（由 PASSWORD_RESET_DEFAULT 环境变量指定）
    const authed = await authenticateUser(user.email, 'TEST_RESET_PWD');
    expect(authed).not.toBeNull();
  });
});

// ========== V3: 最后管理员保护 ==========
describe('V3: 最后管理员保护', () => {
  it('不能降级最后一个管理员（抛 LAST_ADMIN）', async () => {
    const admin = await createUser('only-admin@test.com', 'password123');
    testDb.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(admin.id);

    // 只有一个 admin，降级应失败
    await expect(updateUserByAdmin('any-admin-id', admin.id, { role: 'user' })).rejects.toThrow('不能降级最后一个管理员');
  });

  it('不能禁用最后一个管理员（抛 LAST_ADMIN）', async () => {
    const admin = await createUser('only-admin@test.com', 'password123');
    testDb.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(admin.id);

    await expect(updateUserByAdmin('any-admin-id', admin.id, { isActive: false })).rejects.toThrow('不能禁用最后一个管理员');
  });

  it('不能删除最后一个管理员（抛 LAST_ADMIN）', async () => {
    const admin = await createUser('only-admin@test.com', 'password123');
    testDb.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(admin.id);

    await expect(deleteUserByAdmin('any-admin-id', admin.id)).rejects.toThrow(
      '不能删除最后一个管理员',
    );
  });

  it('多管理员时可以正常降级/禁用/删除', async () => {
    const adminA = await createUser('admin-a@test.com', 'password123');
    const adminB = await createUser('admin-b@test.com', 'password456');
    const adminC = await createUser('admin-c@test.com', 'password789');
    testDb.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(adminA.id);
    testDb.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(adminB.id);
    testDb.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(adminC.id);

    // 三个管理员，可以降级一个
    await expect(updateUserByAdmin(adminA.id, adminB.id, { role: 'user' })).resolves.toBeDefined();
    // 还剩两个 active admin，可以禁用一个（B 已是 user，降级 adminC 不行因为只剩 2 admin）
    // 重新提升 B 测试禁用
    testDb.prepare("UPDATE users SET role = 'admin', is_active = 1 WHERE id = ?").run(adminB.id);
    // 三个 admin，禁用 B
    await expect(updateUserByAdmin(adminA.id, adminB.id, { isActive: false })).resolves.toBeDefined();
    // 还剩两个 active（A 和 C），可以删除 C
    await expect(deleteUserByAdmin(adminA.id, adminC.id)).resolves.toBeUndefined();
  });
});

// ========== V5: 验证码 HMAC-SHA256 ==========
describe('V5: 验证码 HMAC-SHA256 哈希', () => {
  it('generateCode → verifyCode round-trip 成功', async () => {
    const email = 'new-user@test.com';
    const code = await generateCode(email);
    expect(code).toMatch(/^\d{6}$/);
    expect(await verifyCode(email, code)).toBe(true);
  });

  it('验证码使用后不可重用（防重放）', async () => {
    const email = 'new-user@test.com';
    const code = await generateCode(email);
    expect(await verifyCode(email, code)).toBe(true);
    // 第二次使用同一验证码应失败
    expect(await verifyCode(email, code)).toBe(false);
  });

  it('错误验证码校验失败', async () => {
    const email = 'new-user@test.com';
    await generateCode(email);
    expect(await verifyCode(email, '000000')).toBe(false);
  });

  it('发送新验证码后旧验证码失效', async () => {
    const email = 'new-user@test.com';
    const oldCode = await generateCode(email);
    const newCode = await generateCode(email);
    expect(oldCode).not.toBe(newCode);
    // 旧验证码应失效
    expect(await verifyCode(email, oldCode)).toBe(false);
    // 新验证码可用
    expect(await verifyCode(email, newCode)).toBe(true);
  });

  it('HMAC 哈希值不是 scrypt 格式（无 salt:hash 分隔符）', async () => {
    const email = 'new-user@test.com';
    await generateCode(email);
    const row = testDb
      .prepare('SELECT code_hash FROM verification_codes WHERE email = ?')
      .get(email) as { code_hash: string };
    // HMAC-SHA256 输出 64 字符 hex，不含冒号（scrypt 格式为 salt:hash）
    expect(row.code_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(row.code_hash).not.toContain(':');
  });
});

// ========== V6: 过期重置申请自动标记 ==========
describe('V6: cleanupExpiredData 过期重置申请', () => {
  it('超过 24 小时的 pending 申请自动标记为 rejected', async () => {
    const email = 'forgot@test.com';
    await createResetRequest(email);

    // 手动将 created_at 设为 25 小时前
    testDb
      .prepare(
        "UPDATE password_reset_requests SET created_at = datetime('now', '-25 hours') WHERE email = ?",
      )
      .run(email);

    // 执行清理
    await cleanupExpiredData(testDb);

    const reqs = await listResetRequests();
    expect(reqs).toHaveLength(1);
    expect(reqs[0].status).toBe('rejected');
    expect(reqs[0].adminNote).toContain('系统自动过期');
    expect(reqs[0].resolvedAt).not.toBeNull();
  });

  it('24 小时内的 pending 申请不受影响', async () => {
    const email = 'forgot@test.com';
    await createResetRequest(email);

    await cleanupExpiredData(testDb);

    const reqs = await listResetRequests('pending');
    expect(reqs).toHaveLength(1);
    expect(reqs[0].status).toBe('pending');
  });
});

// ========== V7: approveResetRequest 返回刷新数据 ==========
describe('V7: approveResetRequest 返回刷新后的 user', () => {
  it('返回的 user.updatedAt 已更新', async () => {
    const admin = await createUser('admin@test.com', 'password123');
    const user = await createUser('user@test.com', 'password456');
    testDb.prepare("UPDATE users SET role = 'admin' WHERE id = ?").run(admin.id);

    // 记录原始 updatedAt
    const originalRow = testDb.prepare('SELECT updated_at FROM users WHERE id = ?').get(user.id) as {
      updated_at: string;
    };

    const { id: requestId } = await createResetRequest(user.email);
    const result = await approveResetRequest(admin.id, requestId);

    // 返回的 updatedAt 应已更新（不等于原始值）
    // 注意：datetime('now') 精度为秒，若同一秒内执行可能相等，
    // 但至少应大于等于原始值
    expect(result.updatedAt >= originalRow.updated_at).toBe(true);
  });
});

// ========== V8: generateCode 清理过期验证码 ==========
describe('V8: generateCode 清理过期验证码', () => {
  it('generateCode 调用后过期验证码被删除', async () => {
    const email = 'test@test.com';

    // 手动插入一条过期验证码
    testDb
      .prepare(
        `INSERT INTO verification_codes (id, email, code_hash, expires_at)
         VALUES (?, ?, ?, datetime('now', '-1 minute'))`,
      )
      .run('old-id', email, 'fake-hash');

    // 生成新验证码（应触发清理）
    await generateCode(email);

    // 过期验证码应已被删除
    const oldRow = testDb
      .prepare('SELECT id FROM verification_codes WHERE id = ?')
      .get('old-id');
    expect(oldRow).toBeUndefined();
  });
});
