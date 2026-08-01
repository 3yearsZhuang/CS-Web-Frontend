/**
 * @file 密码策略单元测试
 *
 * 覆盖 M6 密码策略升级：
 *   - passwordSchema 长度 + 复杂度（大小写/数字/符号）+ 常见弱密码黑名单
 *   - 历史密码复用检测 isPasswordInHistory
 *   - 历史记录写入与自动清理 recordPasswordHistory
 *
 * 测试策略：
 *   - schema 部分：纯函数测试，无需 DB
 *   - 历史密码部分：内存 SQLite + vi.mock 替换 getDb
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { passwordSchema } from '../../src/shared/security/schemas';

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

import {
  hashPassword,
  isPasswordInHistory,
  recordPasswordHistory,
} from '../../src/modules/auth/server/identity';

const USER_ID = 'user-pw-001';

function initTestSchema() {
  inMemoryDb.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS password_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_password_history_user
      ON password_history(user_id, created_at DESC);
  `);

  // 清空测试数据，确保每个用例独立
  inMemoryDb.exec('DELETE FROM password_history; DELETE FROM users;');

  inMemoryDb.prepare(
    'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
  ).run(USER_ID, 'test@example.com', hashPassword('Old-Pass-2026!'));
}

describe('passwordSchema — 长度 + 复杂度校验', () => {
  it('接受满足所有复杂度要求的强密码', () => {
    const result = passwordSchema.safeParse('Strong-Pass-2026!');
    expect(result.success).toBe(true);
  });

  it('拒绝长度不足 8 位的密码', () => {
    const result = passwordSchema.safeParse('Ab1!');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('密码最少');
    }
  });

  it('拒绝缺少大写字母的密码', () => {
    const result = passwordSchema.safeParse('weakpass2026!');
    expect(result.success).toBe(false);
  });

  it('拒绝缺少小写字母的密码', () => {
    const result = passwordSchema.safeParse('WEAKPASS2026!');
    expect(result.success).toBe(false);
  });

  it('拒绝缺少数字的密码', () => {
    const result = passwordSchema.safeParse('WeakPassword!');
    expect(result.success).toBe(false);
  });

  it('拒绝缺少特殊字符的密码', () => {
    const result = passwordSchema.safeParse('WeakPassword2026');
    expect(result.success).toBe(false);
  });

  it('拒绝常见弱密码黑名单中的密码', () => {
    const weakPasswords = ['Password123!', 'Passw0rd1!', 'Qwerty123!', 'Admin123!'];
    for (const pwd of weakPasswords) {
      const result = passwordSchema.safeParse(pwd);
      expect(result.success).toBe(false);
    }
  });

  it('拒绝项目默认密码 fztbu_cs', () => {
    const result = passwordSchema.safeParse('Fztbu_cs');
    expect(result.success).toBe(false);
  });
});

describe('isPasswordInHistory — 历史密码复用检测', () => {
  beforeEach(() => {
    initTestSchema();
  });

  it('无历史记录时返回 false', () => {
    expect(isPasswordInHistory(USER_ID, 'New-Pass-2026!')).toBe(false);
  });

  it('新密码与历史密码相同返回 true', () => {
    const oldHash = hashPassword('Old-History-Pass-2026!');
    recordPasswordHistory(USER_ID, oldHash);

    expect(isPasswordInHistory(USER_ID, 'Old-History-Pass-2026!')).toBe(true);
  });

  it('新密码与历史密码不同返回 false', () => {
    const oldHash = hashPassword('Old-History-Pass-2026!');
    recordPasswordHistory(USER_ID, oldHash);

    expect(isPasswordInHistory(USER_ID, 'Different-New-Pass-2026!')).toBe(false);
  });

  it('最近 N 条历史密码均可被检测到', () => {
    const N = 5;
    // 插入 N 条历史记录
    for (let i = 0; i < N; i++) {
      recordPasswordHistory(USER_ID, hashPassword(`Hist-${i}-Pass-2026!`));
    }

    // 所有 N 条密码都应被检测到
    for (let i = 0; i < N; i++) {
      expect(isPasswordInHistory(USER_ID, `Hist-${i}-Pass-2026!`)).toBe(true);
    }
    // 无关的新密码不应匹配
    expect(isPasswordInHistory(USER_ID, 'Unrelated-New-Pass-2026!')).toBe(false);
  });

  it('不同用户的密码历史互不影响', () => {
    const user2Id = 'user-pw-002';
    inMemoryDb.prepare(
      'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
    ).run(user2Id, 'user2@example.com', hashPassword('User2-Pass-2026!'));

    recordPasswordHistory(user2Id, hashPassword('User2-Old-Pass-2026!'));

    expect(isPasswordInHistory(USER_ID, 'User2-Old-Pass-2026!')).toBe(false);
  });
});

describe('recordPasswordHistory — 历史记录自动清理', () => {
  beforeEach(() => {
    initTestSchema();
  });

  it('写入历史记录后可被查询到', () => {
    const oldHash = hashPassword('Test-Old-Pass-2026!');
    recordPasswordHistory(USER_ID, oldHash);

    const count = inMemoryDb
      .prepare('SELECT COUNT(*) as c FROM password_history WHERE user_id = ?')
      .get(USER_ID) as { c: number };
    expect(count.c).toBe(1);
  });

  it('超过保留上限 2 倍的旧记录被自动清理', () => {
    const limit = 5;
    const total = limit * 3;

    for (let i = 0; i < total; i++) {
      recordPasswordHistory(USER_ID, hashPassword(`Hist-${i}-Pass-2026!`));
    }

    const count = inMemoryDb
      .prepare('SELECT COUNT(*) as c FROM password_history WHERE user_id = ?')
      .get(USER_ID) as { c: number };
    expect(count.c).toBeLessThanOrEqual(limit * 2);
  });
});
