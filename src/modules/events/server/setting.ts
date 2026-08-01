/**
 * @file 活动模块设置 — 后端读写逻辑
 */

import { getDb } from '@/shared/db';

/** 活动设置项定义 */
export interface EventSettings {
  /** 活动标题最大长度 */
  title_max: number;
  /** 活动描述最大长度 */
  desc_max: number;
  /** 月份字段最大长度 */
  month_max: number;
  /** 日期字段最大长度 */
  date_max: number;
  /** 年份字段最大长度 */
  year_max: number;
  /** 单个标签最大长度 */
  tag_max: number;
  /** 标签最大数量 */
  tags_max: number;
  /** Markdown 内容最大长度 */
  content_max: number;
  /** 默认活动容量（0 = 不限） */
  default_capacity: number;
  /** 最大活动容量 */
  max_capacity: number;
  /** 每页默认显示数量 */
  default_page_size: number;
  /** 最大每页显示数量 */
  max_page_size: number;
}

/** 默认设置值 */
export const DEFAULT_EVENT_SETTINGS: EventSettings = {
  title_max: 120,
  desc_max: 500,
  month_max: 8,
  date_max: 32,
  year_max: 8,
  tag_max: 40,
  tags_max: 10,
  content_max: 10000,
  default_capacity: 0,
  max_capacity: 10000,
  default_page_size: 50,
  max_page_size: 200,
};

function ensureTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id TEXT PRIMARY KEY,
      module TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(module, key)
    );
  `);
}

function readSetting(key: string): string | null {
  ensureTable();
  const db = getDb();
  const row = db
    .prepare('SELECT value FROM settings WHERE module = ? AND key = ?')
    .get('events', key) as { value: string } | undefined;
  return row?.value ?? null;
}

function writeSetting(key: string, value: string): void {
  ensureTable();
  const db = getDb();
  db.prepare(
    `INSERT INTO settings (id, module, key, value, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(module, key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
  ).run(crypto.randomUUID(), 'events', key, value);
}

function removeSetting(key: string): void {
  ensureTable();
  const db = getDb();
  db.prepare('DELETE FROM settings WHERE module = ? AND key = ?').run('events', key);
}

/** 获取活动模块全部设置（数据库值覆盖默认值） */
export function getEventSettings(): EventSettings {
  ensureTable();
  const db = getDb();
  const rows = db
    .prepare('SELECT key, value FROM settings WHERE module = ?')
    .all('events') as Array<{ key: string; value: string }>;

  const settings = { ...DEFAULT_EVENT_SETTINGS };

  for (const row of rows) {
    const k = row.key as keyof EventSettings;
    if (k in settings) {
      try {
        const parsed = JSON.parse(row.value);
        if (typeof parsed === typeof settings[k]) {
          (settings as Record<string, unknown>)[k] = parsed;
        }
      } catch {
        // 解析失败，保持默认值
      }
    }
  }

  return settings;
}

/** 更新单项设置 */
export function updateEventSetting<K extends keyof EventSettings>(
  key: K,
  value: EventSettings[K],
): EventSettings {
  writeSetting(key, JSON.stringify(value));
  return getEventSettings();
}

/** 重置单项设置为默认值 */
export function resetEventSetting<K extends keyof EventSettings>(
  key: K,
): EventSettings {
  removeSetting(key);
  return getEventSettings();
}