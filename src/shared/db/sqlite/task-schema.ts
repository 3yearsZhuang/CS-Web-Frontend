/**
 * @file 任务模块 schema 初始化
 *
 * 包含协会任务、任务认领、积分流水表。
 *
 * 拆分自 src/shared/db/schema.ts 的 initSchema 中任务模块部分。
 */
import type { Database as DB } from 'better-sqlite3';

/**
 * 初始化任务模块表结构（幂等，使用 CREATE TABLE IF NOT EXISTS）
 *
 * - tasks：协会任务表
 * - task_claims：任务认领记录（user × task 多对一，UNIQUE 防重复认领）
 * - points_transactions：积分流水（balance_after 记录变更后余额，便于审计）
 */
export function initTaskSchema(db: DB): void {
  db.exec(`
    -- ============= 协会任务 =============
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

    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
    CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
    CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);

    -- 任务认领
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
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE(task_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_task_claims_task_id ON task_claims(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_claims_user_id ON task_claims(user_id);
    CREATE INDEX IF NOT EXISTS idx_task_claims_status ON task_claims(status);

    -- ============= 积分系统 =============
    CREATE TABLE IF NOT EXISTS points_transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      amount INTEGER NOT NULL DEFAULT 0,
      reason TEXT NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'system',
      source_id TEXT,
      balance_after INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_points_user ON points_transactions(user_id);
    CREATE INDEX IF NOT EXISTS idx_points_created ON points_transactions(created_at);
  `);
}
