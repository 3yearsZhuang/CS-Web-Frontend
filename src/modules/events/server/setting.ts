/**
 * @file 活动模块设置 — 后端读写逻辑（已迁移至 Repository 抽象层，ADR-009）
 */
import { getEventsRepository } from '@/shared/db/repositories/events.repo';

/** 活动设置项定义 */
export interface EventSettings {
  title_max: number;
  desc_max: number;
  month_max: number;
  date_max: number;
  year_max: number;
  tag_max: number;
  tags_max: number;
  content_max: number;
  default_capacity: number;
  max_capacity: number;
  default_page_size: number;
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

/** 获取活动模块全部设置（数据库值覆盖默认值） */
export async function getEventSettings(): Promise<EventSettings> {
  const repo = getEventsRepository();
  await repo.ensureSettingsTable();
  const rows = await repo.listSettings();

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
export async function updateEventSetting<K extends keyof EventSettings>(
  key: K,
  value: EventSettings[K],
): Promise<EventSettings> {
  const repo = getEventsRepository();
  await repo.ensureSettingsTable();
  await repo.writeSetting(key, JSON.stringify(value));
  return getEventSettings();
}

/** 重置单项设置为默认值 */
export async function resetEventSetting<K extends keyof EventSettings>(
  key: K,
): Promise<EventSettings> {
  const repo = getEventsRepository();
  await repo.ensureSettingsTable();
  await repo.removeSetting(key);
  return getEventSettings();
}
