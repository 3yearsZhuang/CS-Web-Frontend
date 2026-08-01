/**
 * @file 通知模块 schema 初始化
 *
 * 包含站内通知与全站公告表。
 *
 * 拆分自 src/shared/db/sqlite-init.ts 的 initSchema 中通知模块部分。
 */
import type { Database as DB } from 'better-sqlite3';

/**
 * 初始化通知模块表结构（幂等，使用 CREATE TABLE IF NOT EXISTS）
 *
 * - notifications：站内通知表（type: system | admin | activity，is_read 标记已读）
 * - announcements：全站公告（管理员创建，Navbar 下方横幅展示）
 */
export function initNotificationSchema(db: DB): void {
  db.exec(`
    -- 站内通知表
    -- type: 'system' | 'admin' | 'activity'
    -- read: 是否已读
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      sender_id TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

    -- ============= 全站公告 =============
    -- 管理员创建，在 Navbar 下方以横幅形式展示
    -- level: 'info' | 'warning' | 'success' | 'error' — 影响横幅颜色
    -- is_active: 是否当前生效（管理员可手动关闭）
    -- is_dismissible: 是否允许用户关闭（关闭后存储在 localStorage）
    -- priority: 排序权重（数字越大越靠前）
    -- expires_at: 过期时间（NULL 表示永不过期，除非手动关闭）
    -- target_roles: JSON 数组 — 可见角色，NULL 表示所有人可见
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

    CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON announcements(is_active);
    CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority);
  `);
}
