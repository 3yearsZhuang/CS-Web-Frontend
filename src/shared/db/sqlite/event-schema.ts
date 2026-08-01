/**
 * @file 活动模块 schema 初始化
 *
 * 包含活动、活动报名、活动签到、活动参与记录表，以及 events 表的废弃列清理迁移。
 *
 * 拆分自 src/shared/db/sqlite-init.ts 的 initSchema 中活动模块部分。
 */
import type { Database as DB } from 'better-sqlite3';

/**
 * 迁移：从 events 表中删除废弃的 category 和 sort_order 列
 *
 * SQLite 不支持 ALTER TABLE DROP COLUMN，通过重建表实现：
 * 1. 创建不含废弃列的新表
 * 2. 复制数据
 * 3. 删除旧表并重命名新表
 * 4. 重建索引
 */
function migrateEventsDropLegacyColumns(db: DB): void {
  // 事务包裹：CREATE + INSERT + DROP + RENAME 必须原子，避免中途失败致 events 表缺失
  db.transaction(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS events_new (
        id TEXT PRIMARY KEY,
        month TEXT,
        date TEXT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT,
        year TEXT,
        topics TEXT,
        tags TEXT,
        is_pinned INTEGER NOT NULL DEFAULT 0,
        capacity INTEGER NOT NULL DEFAULT 0,
        content_markdown TEXT,
        created_by TEXT,
        registration_fields TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      );

      INSERT INTO events_new
        (id, month, date, title, description, status, year, topics, tags,
         is_pinned, capacity, content_markdown, created_by, registration_fields, created_at, updated_at)
      SELECT id, month, date, title, description, status, year, topics, tags,
             is_pinned, capacity, content_markdown, created_by, registration_fields, created_at, updated_at
      FROM events;

      DROP TABLE events;
      ALTER TABLE events_new RENAME TO events;

      CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id);
    `);
  })();
}

/**
 * 初始化活动模块表结构（幂等，使用 CREATE TABLE IF NOT EXISTS）
 *
 * - activity_participations：活动参与记录（历史表，记录用户参与过的活动）
 * - events：活动表（统一存储所有活动；month/date/status/year/topics/tags 为冗余/JSON 字段；
 *           capacity 上限（0 不限）；content_markdown Markdown 详情；created_by 创建管理员）
 * - event_registrations：活动报名表（user × event 多对多，UNIQUE 防重复报名）
 * - event_checkins：活动签到表（通过 checkin_code 唯一标识一次签到）
 */
export function initEventSchema(db: DB): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_participations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      activity_title TEXT NOT NULL,
      activity_date TEXT NOT NULL,
      role TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 活动表：统一存储所有活动
    -- month/date/status 用于活动时间与状态；year 从 date 中提取作为冗余字段
    -- topics/tags 为 JSON 数组字符串
    -- capacity：活动容量上限（0 表示不限）；content_markdown：Markdown 格式详情内容
    -- created_by：创建活动的管理员 user id
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
      is_pinned INTEGER NOT NULL DEFAULT 0,
      capacity INTEGER NOT NULL DEFAULT 0,
      content_markdown TEXT,
      created_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- 活动报名表：用户-活动多对多
    -- UNIQUE(user_id, event_id) 防止重复报名
    CREATE TABLE IF NOT EXISTS event_registrations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'registered', -- 'registered' | 'cancelled' | 'waitlisted'
      registered_at TEXT DEFAULT (datetime('now')),
      cancelled_at TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      UNIQUE(user_id, event_id)
    );

    CREATE INDEX IF NOT EXISTS idx_activity_participations_user_id ON activity_participations(user_id);
    CREATE INDEX IF NOT EXISTS idx_event_registrations_event_id ON event_registrations(event_id);
    CREATE INDEX IF NOT EXISTS idx_event_registrations_user_id ON event_registrations(user_id);

    -- ============= 活动签到 =============
    CREATE TABLE IF NOT EXISTS event_checkins (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      registration_id TEXT,
      user_id TEXT,
      checkin_code TEXT NOT NULL,
      checked_in_at TEXT,
      checked_in_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      FOREIGN KEY (registration_id) REFERENCES event_registrations(id) ON DELETE SET NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY (checked_in_by) REFERENCES users(id) ON DELETE SET NULL,
      UNIQUE(registration_id)
    );

    CREATE INDEX IF NOT EXISTS idx_event_checkins_event_id ON event_checkins(event_id);
    CREATE INDEX IF NOT EXISTS idx_event_checkins_code ON event_checkins(checkin_code);
  `);

  // 增量迁移：为已存在的 events 表添加新列 / 删除废弃列
  const existingEventsCols = new Set(
    (db.prepare('PRAGMA table_info(events)').all() as Array<{ name: string }>).map(
      (row) => row.name,
    ),
  );

  const newEventCols: Array<{ name: string; def: string }> = [
    { name: 'capacity', def: 'INTEGER NOT NULL DEFAULT 0' },
    { name: 'content_markdown', def: 'TEXT' },
    { name: 'created_by', def: 'TEXT' },
    { name: 'registration_fields', def: 'TEXT' },
    { name: 'is_pinned', def: 'INTEGER NOT NULL DEFAULT 0' },
  ];

  for (const col of newEventCols) {
    if (!existingEventsCols.has(col.name)) {
      db.exec(`ALTER TABLE events ADD COLUMN ${col.name} ${col.def};`);
    }
  }

  // 清理废弃列：category 和 sort_order（如果存在则迁移数据后删除）
  // SQLite 不支持 ALTER TABLE DROP COLUMN，采用重建表策略
  if (existingEventsCols.has('category') || existingEventsCols.has('sort_order')) {
    migrateEventsDropLegacyColumns(db);
  }

  // 增量迁移：为已存在的 event_registrations 表添加 form_data 列
  const existingRegsCols = new Set(
    (db.prepare('PRAGMA table_info(event_registrations)').all() as Array<{ name: string }>).map(
      (row) => row.name,
    ),
  );

  if (!existingRegsCols.has('form_data')) {
    db.exec('ALTER TABLE event_registrations ADD COLUMN form_data TEXT;');
  }
}
