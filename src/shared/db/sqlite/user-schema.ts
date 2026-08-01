/**
 * @file 用户模块 schema 初始化
 *
 * 包含用户、会话、登录历史表的建表与增量列迁移。
 *
 * 拆分自 src/shared/db/schema.ts 的 initSchema 中用户模块部分。
 */
import type { Database as DB } from 'better-sqlite3';

/**
 * 初始化用户模块表结构（幂等，使用 CREATE TABLE IF NOT EXISTS）
 *
 * - users：用户表，存储邮箱、密码哈希与个人资料
 * - sessions：会话表，存储 session token 与过期时间
 * - login_history：登录历史（成功/失败），用于安全审计
 */
export function initUserSchema(db: DB): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS login_history (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      ip TEXT,
      user_agent TEXT,
      success INTEGER NOT NULL DEFAULT 1,
      attempted_email TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_login_history_attempted_email ON login_history(attempted_email, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
    CREATE INDEX IF NOT EXISTS idx_login_history_created_at ON login_history(created_at);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `);

  // 增量迁移：为已存在的 users 表添加个人资料列
  // SQLite 不支持 ADD COLUMN IF NOT EXISTS，需先查询现有列
  const existingUsersCols = new Set(
    (db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>).map(
      (row) => row.name,
    ),
  );

  const newUserCols: Array<{ name: string; def: string }> = [
    { name: 'display_name', def: 'TEXT' },
    { name: 'bio', def: 'TEXT' },
    { name: 'avatar_url', def: 'TEXT' },
    { name: 'avatar_type', def: "TEXT DEFAULT 'initial'" },
    { name: 'github_url', def: 'TEXT' },
    { name: 'website_url', def: 'TEXT' },
    { name: 'role', def: "TEXT NOT NULL DEFAULT 'user'" },
    { name: 'is_active', def: 'INTEGER NOT NULL DEFAULT 1' },
    // SQLite 不支持 ALTER TABLE ADD COLUMN 时加 UNIQUE，
    // github_id 列先以普通 TEXT 添加，再通过索引实现唯一性约束。
    { name: 'github_id', def: 'TEXT' },
  ];

  for (const col of newUserCols) {
    if (!existingUsersCols.has(col.name)) {
      db.exec(`ALTER TABLE users ADD COLUMN ${col.name} ${col.def};`);
    }
  }

  // 增量迁移：为已存在的 sessions 表添加 ip / user_agent 列
  const existingSessionCols = new Set(
    (db.prepare('PRAGMA table_info(sessions)').all() as Array<{ name: string }>).map(
      (row) => row.name,
    ),
  );
  if (!existingSessionCols.has('ip')) {
    db.exec('ALTER TABLE sessions ADD COLUMN ip TEXT;');
  }
  if (!existingSessionCols.has('user_agent')) {
    db.exec('ALTER TABLE sessions ADD COLUMN user_agent TEXT;');
  }

  // 增量迁移：为已存在的 users 表添加 tech_tags 列
  if (!existingUsersCols.has('tech_tags')) {
    db.exec("ALTER TABLE users ADD COLUMN tech_tags TEXT DEFAULT '[]';");
  }

  // 增量迁移之后创建索引（确保列已存在）
  // 使用唯一索引实现 github_id 的唯一性约束（SQLite ALTER TABLE 不支持 ADD COLUMN UNIQUE）
  // 超级管理员唯一约束：role='root' 的记录最多 1 条（partial unique index）
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_github_id ON users(github_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_root_unique ON users(id) WHERE role = 'root';
  `);
}
