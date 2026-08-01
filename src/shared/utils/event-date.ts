/**
 * @file 活动日期解析工具
 *
 * 统一的 date 字段解析，避免 month-calendar / year-accordion-timeline 中
 * 各写一份正则解析逻辑。admin 表单的 date 支持以下格式（由 placeholder
 * 2026.09.15 推导）：YYYY.MM.DD / YYYY-MM-DD / YYYY/MM/DD。
 * 注意：new Date('2026.09.15') 在多数 JS 引擎返回 Invalid Date，必须手动解析。
 */

/** 解析后的活动日期三元组（month 为 0-11） */
export interface ParsedEventDate {
  year: number;
  month: number;
  day: number;
}

/** date 字段支持的分隔符：. - / */
const DATE_PATTERN = /^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})/;

/** 将活动 date 字段解析为 { year, month, day }，不匹配或非法返回 null */
export function parseEventDate(dateStr: string | null): ParsedEventDate | null {
  if (!dateStr) return null;
  const match = dateStr.trim().match(DATE_PATTERN);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);
  if (month < 0 || month > 11) return null;
  if (day < 1 || day > 31) return null;
  return { year, month, day };
}

/** 将日期规范化为 YYYY-MM-DD 键，用于活动按日分组 / 日历网格查找 */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 判断活动日期是否已过（同日不算"已过"，与后端 autoArchive 的 < 语义一致） */
export function isPastDate(dateStr: string | null): boolean {
  const parsed = parseEventDate(dateStr);
  if (!parsed) return false;
  const d = new Date(parsed.year, parsed.month, parsed.day);
  if (isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}
