/**
 * @file 活动 CRUD 服务
 */

import crypto from 'node:crypto';
import { getDb } from '@/shared/db';
import { logger } from '@/shared/logger';
import { AppError } from '@/shared/app-error';
import { logAdminAction } from '@/shared/security/audit';
import { appBus } from '@/shared/events/event-bus';
import { computePagination, computeTotalPages } from '@/shared/utils/pagination';
import { autoArchivePastEvents } from './archive';
import {
  type EventStatus,
  type EventRow,
  type RegistrationField,
  type EventItem,
  type EventInput,
  type RegistrationStatus,
  type EventRegistration,
  type EventRegistrationRow,
  type PaginatedEvents,
  type ListEventsFilters,
  EVENT_LIMITS as LIMITS,
} from '../types';

/** 将数据库行转换为 EventItem 对象 */
export function toEventItem(row: EventRow): EventItem {
  let topics: string[] = [];
  let tags: string[] = [];
  let registrationFields: RegistrationField[] = [];
  try {
    if (row.topics) topics = JSON.parse(row.topics) as string[];
  } catch {
  }
  try {
    if (row.tags) tags = JSON.parse(row.tags) as string[];
  } catch {
  }
  try {
    if (row.registration_fields) registrationFields = JSON.parse(row.registration_fields) as RegistrationField[];
  } catch {
  }
  return {
    id: row.id,
    month: row.month ?? null,
    date: row.date ?? null,
    title: row.title,
    description: row.description ?? null,
    status: (['upcoming', 'ongoing', 'ended'].includes(row.status ?? '')
      ? row.status
      : null) as EventStatus | null,
    year: row.year ?? null,
    topics,
    tags,
    isPinned: row.is_pinned === 1,
    capacity: row.capacity ?? 0,
    contentMarkdown: row.content_markdown ?? null,
    registrationFields,
    createdBy: row.created_by ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** 将数据库行转换为 EventRegistration 对象 */
export function toEventRegistration(row: EventRegistrationRow): EventRegistration {
  let formData: Record<string, string> | null = null;
  try {
    if (row.form_data) formData = JSON.parse(row.form_data) as Record<string, string>;
  } catch {
  }
  return {
    id: row.id,
    userId: row.user_id,
    eventId: row.event_id,
    status: (['registered', 'cancelled', 'waitlisted'].includes(row.status)
      ? row.status
      : 'registered') as RegistrationStatus,
    formData,
    registeredAt: row.registered_at,
    cancelledAt: row.cancelled_at ?? null,
  };
}

/** 校验活动输入数据，返回错误信息或 null */
export function validateInput(input: EventInput): string | null {
  if (!input.title || !input.title.trim()) {
    return '标题不能为空';
  }
  if (input.title.length > LIMITS.TITLE_MAX) {
    return `标题不能超过 ${LIMITS.TITLE_MAX} 字符`;
  }
  if (input.description && input.description.length > LIMITS.DESC_MAX) {
    return `描述不能超过 ${LIMITS.DESC_MAX} 字符`;
  }
  if (input.month && input.month.length > LIMITS.MONTH_MAX) {
    return `月份不能超过 ${LIMITS.MONTH_MAX} 字符`;
  }
  if (input.date && input.date.length > LIMITS.DATE_MAX) {
    return `日期不能超过 ${LIMITS.DATE_MAX} 字符`;
  }
  if (input.year && input.year.length > LIMITS.YEAR_MAX) {
    return `年份不能超过 ${LIMITS.YEAR_MAX} 字符`;
  }
  if (input.status && !['upcoming', 'ongoing', 'ended'].includes(input.status)) {
    return '状态必须为 upcoming / ongoing / ended';
  }
  const tagsArr = input.tags ?? [];
  if (tagsArr.length > LIMITS.TAGS_MAX) {
    return `标签数量不能超过 ${LIMITS.TAGS_MAX}`;
  }
  if (tagsArr.some((t) => t.length > LIMITS.TAG_MAX)) {
    return `单个标签不能超过 ${LIMITS.TAG_MAX} 字符`;
  }
  const topicsArr = input.topics ?? [];
  if (topicsArr.length > LIMITS.TAGS_MAX) {
    return `主题数量不能超过 ${LIMITS.TAGS_MAX}`;
  }
  if (topicsArr.some((t) => t.length > LIMITS.TAG_MAX)) {
    return `单个主题不能超过 ${LIMITS.TAG_MAX} 字符`;
  }
  if (input.capacity !== undefined && input.capacity < 0) {
    return '活动容量不能为负数';
  }
  if (input.capacity !== undefined && !Number.isInteger(input.capacity)) {
    return '活动容量必须为整数';
  }
  if (input.contentMarkdown && input.contentMarkdown.length > LIMITS.CONTENT_MAX) {
    return `活动详情不能超过 ${LIMITS.CONTENT_MAX} 字符`;
  }
  const regFields = input.registrationFields ?? [];
  if (regFields.length > LIMITS.TAGS_MAX) {
    return `自定义报名字段数量不能超过 ${LIMITS.TAGS_MAX}`;
  }
  const fieldTypeSet = new Set(['text', 'textarea', 'select', 'checkbox']);
  for (const f of regFields) {
    if (!f.key || !f.key.trim()) return '自定义字段的 key 不能为空';
    if (f.key.length > LIMITS.TAG_MAX) return `自定义字段 key 不能超过 ${LIMITS.TAG_MAX} 字符`;
    if (!f.label || !f.label.trim()) return '自定义字段的 label 不能为空';
    if (f.label.length > LIMITS.TAG_MAX) return `自定义字段 label 不能超过 ${LIMITS.TAG_MAX} 字符`;
    if (!fieldTypeSet.has(f.type)) return `自定义字段类型无效：${f.type}`;
    if (f.key.startsWith('_')) return '自定义字段的 key 不能以下划线开头';
  }
  return null;
}

/** 列出活动列表，支持分页和筛选 */
export function listEvents(filters?: ListEventsFilters): PaginatedEvents;
/** 列出所有活动 */
export function listEvents(): EventItem[];
export function listEvents(
  filters?: ListEventsFilters,
): EventItem[] | PaginatedEvents {
  const db = getDb();

  const archivedCount = autoArchivePastEvents(db);
  if (archivedCount > 0) {
    logger.info({ archivedCount }, '时间校验：活动自动标记为已结束');
  }

  const hasPagination = filters?.page !== undefined || filters?.pageSize !== undefined;

  const whereClauses: string[] = [];
  const params: unknown[] = [];

  if (filters?.status) {
    whereClauses.push('status = ?');
    params.push(filters.status);
  }
  if (filters?.search && filters.search.trim()) {
    whereClauses.push('(title LIKE ? OR description LIKE ?)');
    const searchTerm = `%${filters.search.trim()}%`;
    params.push(searchTerm, searchTerm);
  }
  if (filters?.tag && filters.tag.trim()) {
    whereClauses.push('tags LIKE ?');
    params.push(`%"${filters.tag.trim()}"%`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  if (!hasPagination) {
    const rows = db
      .prepare(
        `SELECT * FROM events ${whereSql} ORDER BY is_pinned DESC, date DESC`,
      )
      .all(...params) as EventRow[];
    return rows.map(toEventItem);
  }

  const { page, pageSize, offset } = computePagination({
    page: filters.page,
    pageSize: filters.pageSize,
    defaultPageSize: 50,
    maxPageSize: 200,
  });

  const totalRow = db
    .prepare(`SELECT COUNT(*) as count FROM events ${whereSql}`)
    .get(...params) as { count: number };
  const total = totalRow.count;
  const totalPages = computeTotalPages(total, pageSize);

  const rows = db
    .prepare(
      `SELECT * FROM events ${whereSql} ORDER BY is_pinned DESC, date DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, offset) as EventRow[];

  return {
    events: rows.map(toEventItem),
    total,
    page,
    pageSize,
    totalPages,
  };
}

/** 根据 ID 获取单个活动详情 */
export function getEventById(
  eventId: string,
  options?: { withRegisteredCount?: boolean },
): EventItem | null {
  const db = getDb();

  // 归档过期活动 — 日期格式兼容（详见 archive.ts 注释）
  const nowDate = new Date().toISOString().slice(0, 10);
  db.prepare(
    `UPDATE events SET status = 'ended', updated_at = datetime('now')
     WHERE id = ? AND status != 'ended' AND date IS NOT NULL AND date != ''
       AND substr(REPLACE(REPLACE(date, '.', '-'), '/', '-'), 1, 10) < ?`,
  ).run(eventId, nowDate);

  const row = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId) as
    | EventRow
    | undefined;
  if (!row) return null;
  const event = toEventItem(row);
  if (options?.withRegisteredCount) {
    event.registeredCount = getRegisteredCount(eventId);
  }
  return event;
}

/** 创建新活动 */
export function createEvent(adminId: string, input: EventInput): EventItem {
  const validationErr = validateInput(input);
  if (validationErr) throw new AppError(validationErr, 'VALIDATION_ERROR');

  const db = getDb();
  const id = crypto.randomUUID();
  const topicsStr = input.topics?.length ? JSON.stringify(input.topics) : null;
  const tagsStr = input.tags?.length ? JSON.stringify(input.tags) : null;
  const registrationFieldsStr = input.registrationFields?.length ? JSON.stringify(input.registrationFields) : null;

  db.prepare(
    `INSERT INTO events (id, month, date, title, description, status, year, topics, tags, is_pinned, capacity, content_markdown, registration_fields, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.month ?? null,
    input.date ?? null,
    input.title.trim(),
    input.description ?? null,
    input.status ?? null,
    input.year ?? null,
    topicsStr,
    tagsStr,
    input.isPinned ? 1 : 0,
    input.capacity ?? 0,
    input.contentMarkdown ?? null,
    registrationFieldsStr,
    adminId,
  );

  logAdminAction(adminId, 'create_event', null, {
    eventId: id,
    title: input.title,
  });

  const row = db.prepare('SELECT * FROM events WHERE id = ?').get(id) as EventRow;
  const eventItem = toEventItem(row);

  try {
    appBus.emit('event.created', {
      eventId: id,
      title: eventItem.title,
      description: eventItem.description,
      adminId,
    });
  } catch (err) {
    logger.error({ err }, '新活动通知发送失败');
  }

  return eventItem;
}

/** 更新活动信息 */
export function updateEvent(
  adminId: string,
  eventId: string,
  input: Partial<EventInput>,
): EventItem {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId) as
    | EventRow
    | undefined;
  if (!existing) {
    throw new AppError('活动不存在', 'NOT_FOUND');
  }

  const merged: EventInput = {
    month: input.month !== undefined ? input.month : existing.month,
    date: input.date !== undefined ? input.date : existing.date,
    title: input.title !== undefined ? input.title : existing.title,
    description:
      input.description !== undefined ? input.description : existing.description,
    status:
      input.status !== undefined
        ? input.status
        : (existing.status as EventStatus | null),
    year: input.year !== undefined ? input.year : existing.year,
    topics: input.topics !== undefined ? input.topics : undefined,
    tags: input.tags !== undefined ? input.tags : undefined,
    isPinned:
      input.isPinned !== undefined
        ? input.isPinned
        : existing.is_pinned === 1,
    capacity: input.capacity !== undefined ? input.capacity : existing.capacity,
    contentMarkdown:
      input.contentMarkdown !== undefined
        ? input.contentMarkdown
        : existing.content_markdown,
    registrationFields: input.registrationFields,
  };
  if (input.topics === undefined && existing.topics) {
    try {
      merged.topics = JSON.parse(existing.topics) as string[];
    } catch {
      merged.topics = [];
    }
  }
  if (input.tags === undefined && existing.tags) {
    try {
      merged.tags = JSON.parse(existing.tags) as string[];
    } catch {
      merged.tags = [];
    }
  }
  if (input.registrationFields === undefined && existing.registration_fields) {
    try {
      merged.registrationFields = JSON.parse(existing.registration_fields) as RegistrationField[];
    } catch {
      merged.registrationFields = [];
    }
  }

  const validationErr = validateInput(merged);
  if (validationErr) throw new AppError(validationErr, 'VALIDATION_ERROR');

  const topicsStr = merged.topics?.length ? JSON.stringify(merged.topics) : null;
  const tagsStr = merged.tags?.length ? JSON.stringify(merged.tags) : null;
  const registrationFieldsStr = merged.registrationFields?.length ? JSON.stringify(merged.registrationFields) : null;

  db.prepare(
    `UPDATE events
     SET month = ?, date = ?, title = ?, description = ?, status = ?, year = ?,
         topics = ?, tags = ?, is_pinned = ?, capacity = ?, content_markdown = ?,
         registration_fields = ?, updated_at = datetime('now')
     WHERE id = ?`,
  ).run(
    merged.month ?? null,
    merged.date ?? null,
    merged.title.trim(),
    merged.description ?? null,
    merged.status ?? null,
    merged.year ?? null,
    topicsStr,
    tagsStr,
    merged.isPinned ? 1 : 0,
    merged.capacity ?? 0,
    merged.contentMarkdown ?? null,
    registrationFieldsStr,
    eventId,
  );

  logAdminAction(adminId, 'update_event', null, { eventId, changes: input });

  const row = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId) as EventRow;
  return toEventItem(row);
}

/** 删除活动 */
export function deleteEvent(adminId: string, eventId: string): void {
  const db = getDb();
  const existing = db.prepare('SELECT id, title FROM events WHERE id = ?').get(eventId) as
    | { id: string; title: string }
    | undefined;
  if (!existing) {
    throw new AppError('活动不存在', 'NOT_FOUND');
  }

  db.prepare('DELETE FROM events WHERE id = ?').run(eventId);

  logAdminAction(adminId, 'delete_event', null, {
    eventId,
    title: existing.title,
  });
}

/** 获取活动的已报名人数 */
export function getRegisteredCount(eventId: string): number {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT COUNT(*) as count FROM event_registrations WHERE event_id = ? AND status = 'registered'",
    )
    .get(eventId) as { count: number };
  return row.count;
}

/** 批量更新活动状态 */
export function batchUpdateEvents(
  adminId: string,
  eventIds: string[],
  operation: { status?: EventStatus | null },
): { success: number; failed: number; errors: string[] } {
  const db = getDb();
  let success = 0;
  let failed = 0;
  const errors: string[] = [];

  const updates: string[] = [];
  const params: unknown[] = [];

  if (operation.status !== undefined) {
    updates.push('status = ?');
    params.push(operation.status);
  }

  if (updates.length === 0) {
    return { success: 0, failed: eventIds.length, errors: ['未指定任何操作'] };
  }

  updates.push("updated_at = datetime('now')");

  for (const eventId of eventIds) {
    try {
      const existing = db.prepare('SELECT id FROM events WHERE id = ?').get(eventId);
      if (!existing) {
        failed++;
        errors.push(`${eventId}: 活动不存在`);
        continue;
      }

      db.prepare(
        `UPDATE events SET ${updates.join(', ')} WHERE id = ?`,
      ).run(...params, eventId);
      success++;
    } catch (err) {
      failed++;
      errors.push(`${eventId}: ${err instanceof Error ? err.message : '未知错误'}`);
    }
  }

  logAdminAction(adminId, 'batch_update_events', null, {
    eventIds,
    operation,
    success,
    failed,
  });

  return { success, failed, errors };
}