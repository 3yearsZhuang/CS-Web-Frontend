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

/** 获取活动日期的毫秒时间戳，解析失败返回 Number.NEGATIVE_INFINITY */
export function getEventTimestamp(dateStr: string | null): number {
  const parsed = parseEventDate(dateStr);
  if (!parsed) return Number.NEGATIVE_INFINITY;
  return new Date(parsed.year, parsed.month, parsed.day).getTime();
}

export interface SortableEvent {
  id?: string | number;
  date?: string | null;
  month?: string | null;
  year?: string | number | null;
  isPinned?: boolean;
  is_pinned?: boolean;
  createdAt?: string;
  created_at?: string;
}

/** 比较两个活动的展示顺序：置顶优先 -> 日期降序 -> ID 降序 */
export function compareEvents(a: SortableEvent, b: SortableEvent): number {
  const pinnedA = Boolean(a.isPinned ?? a.is_pinned);
  const pinnedB = Boolean(b.isPinned ?? b.is_pinned);
  if (pinnedA !== pinnedB) {
    return pinnedB ? 1 : -1;
  }

  const timeA = getEventTimestamp(a.date ?? null);
  const timeB = getEventTimestamp(b.date ?? null);
  if (timeA !== timeB) {
    return timeB - timeA;
  }

  const idA = Number(a.id);
  const idB = Number(b.id);
  if (!Number.isNaN(idA) && !Number.isNaN(idB) && idA !== idB) {
    return idB - idA;
  }

  return 0;
}

/** 智能推导活动年份：优先显式 year -> 从 date 推导 -> 从 month 推导 -> fallbackLabel */
export function getEventYear(event: SortableEvent, fallbackLabel = '未分类'): string {
  if (event.year != null && String(event.year).trim()) {
    return String(event.year).trim();
  }
  const parsed = parseEventDate(event.date ?? null);
  if (parsed) {
    return String(parsed.year);
  }
  if (event.month && typeof event.month === 'string') {
    const match = event.month.trim().match(/^(\d{4})/);
    if (match) return match[1];
  }
  return fallbackLabel;
}

/** 年份分组结构 */
export interface EventYearGroup<T> {
  year: string;
  events: T[];
}

/** 将活动按年份分组，每组内及未分类均按 compareEvents 严格降序排序，年份亦按降序排列 */
export function groupEventsByYear<T extends SortableEvent>(
  events: T[],
  uncategorizedLabel = '未分类',
): {
  uncategorized: T[];
  yearGroups: EventYearGroup<T>[];
} {
  const map = new Map<string, T[]>();

  for (const e of events) {
    const y = getEventYear(e, uncategorizedLabel);
    if (!map.has(y)) map.set(y, []);
    map.get(y)!.push(e);
  }

  // 组内严格按置顶和时间降序排序
  for (const [y, groupEvents] of map.entries()) {
    map.set(y, [...groupEvents].sort(compareEvents));
  }

  const uncategorized = map.get(uncategorizedLabel) ?? [];
  map.delete(uncategorizedLabel);

  // 年份按数字/字符串降序排序
  const sortedYears = Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  const yearGroups = sortedYears.map(([year, groupEvents]) => ({ year, events: groupEvents }));

  return { uncategorized, yearGroups };
}

