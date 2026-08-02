/**
 * @file 活动模块 CRUD 服务（已迁移至 Repository 抽象层，ADR-009）
 */
import crypto from 'node:crypto';
import { getEventsRepository } from '@/shared/db/repositories/events.repo';
import { getDbEngine } from '@/shared/db/drivers';
import type { EventRow } from '@/shared/db/repositories/events.repo';
import { AppError } from '@/shared/app-error';
import { logAdminAction } from '@/shared/security/audit';
import {
  type EventItem,
  type EventInput,
  type EventStatus,
  type PaginatedEvents,
  type ListEventsFilters,
} from '../types';

function toEvent(
  row: EventRow,
  opts?: { registeredCount?: number; isRegistered?: boolean },
): EventItem {
  const capacity = row.capacity || 0;
  const registeredCount = opts?.registeredCount ?? 0;
  return {
    id: row.id,
    month: null,
    date: row.date ?? '',
    title: row.title,
    description: row.description ?? '',
    status: (row.status as EventStatus) ?? 'upcoming',
    year: null,
    topics: row.tags ? JSON.parse(row.tags) : [],
    tags: row.tags ? JSON.parse(row.tags) : [],
    isPinned: false,
    capacity,
    contentMarkdown: row.content ?? '',
    registrationFields: [],
    createdBy: row.created_by ?? null,
    registeredCount,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 自动归档过期活动（delegate to repository）
 * 返回被归档的活动数量
 */
export async function autoArchivePastEvents(): Promise<number> {
  const repo = getEventsRepository();
  const nowDate = new Date().toISOString().slice(0, 10);
  return repo.archivePastEvents(nowDate);
}

/** 列出活动（分页，自动归档过期活动） */
export async function listEvents(query: ListEventsFilters = {}): Promise<PaginatedEvents> {
  const repo = getEventsRepository();
  await autoArchivePastEvents();

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, query.pageSize ?? 12));
  const offset = (page - 1) * pageSize;

  const where: string[] = [];
  const params: unknown[] = [];
  if (query.status) {
    where.push('status = ?');
    params.push(query.status);
  }
  if (query.search) {
    where.push('(title LIKE ? OR description LIKE ?)');
    const like = `%${query.search}%`;
    params.push(like, like);
  }
  if (query.tag) {
    where.push('tags LIKE ?');
    params.push(`%"${query.tag}"%`);
  }

  const [total, rows] = await Promise.all([
    repo.countEvents(where, params),
    repo.listEvents(where, params, pageSize, offset),
  ]);

  const eventIds = rows.map((r) => r.id);
  const statsMap = new Map<string, number>();
  for (const id of eventIds) {
    statsMap.set(id, await repo.checkCapacityUsed(id));
  }

  const events = rows.map((row) => toEvent(row, { registeredCount: statsMap.get(row.id) ?? 0 }));

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { events, total, page, pageSize, totalPages };
}

/** 获取单个活动详情 */
export async function getEvent(id: string): Promise<EventItem> {
  const repo = getEventsRepository();
  await autoArchivePastEvents();
  const row = await repo.getEventById(id);
  if (!row) throw new AppError('活动不存在', 'NOT_FOUND');
  const count = await repo.checkCapacityUsed(id);
  return toEvent(row, { registeredCount: count });
}

/** 创建活动（管理员） */
export async function createEvent(input: EventInput, operatorId: string): Promise<{ id: string }> {
  const repo = getEventsRepository();
  const id = crypto.randomUUID();
  await repo.insertEvent({
    id,
    title: input.title,
    description: input.description ?? null,
    content: input.contentMarkdown ?? null,
    date: input.date ?? null,
    location: null,
    capacity: input.capacity ?? 0,
    tags: JSON.stringify(input.tags ?? []),
    coverImage: null,
    status: (input.status as string) ?? 'upcoming',
    createdBy: operatorId,
  });
  await logAdminAction(operatorId, 'events.create', id, { targetType: 'event', title: input.title });
  return { id };
}

/** 更新活动（管理员） */
export async function updateEvent(id: string, updates: Partial<EventInput>, operatorId: string): Promise<void> {
  const repo = getEventsRepository();
  const existing = await repo.getEventById(id);
  if (!existing) throw new AppError('活动不存在', 'NOT_FOUND');

  const sets: string[] = [];
  const values: unknown[] = [];
  if (updates.title !== undefined) {
    sets.push('title = ?');
    values.push(updates.title);
  }
  if (updates.description !== undefined) {
    sets.push('description = ?');
    values.push(updates.description);
  }
  if (updates.contentMarkdown !== undefined) {
    sets.push('content = ?');
    values.push(updates.contentMarkdown);
  }
  if (updates.date !== undefined) {
    sets.push('date = ?');
    values.push(updates.date);
  }
  if (updates.capacity !== undefined) {
    sets.push('capacity = ?');
    values.push(updates.capacity);
  }
  if (updates.tags !== undefined) {
    sets.push('tags = ?');
    values.push(JSON.stringify(updates.tags));
  }
  if (updates.status !== undefined) {
    sets.push('status = ?');
    values.push(updates.status);
  }
  if (sets.length === 0) return;
  sets.push("updated_at = datetime('now')");
  await repo.updateEvent(sets, values, id);
  await logAdminAction(operatorId, 'events.update', id, { targetType: 'event', updates });
}

/** 删除活动（管理员） */
export async function deleteEvent(id: string, operatorId: string): Promise<void> {
  const repo = getEventsRepository();
  const existing = await repo.getEventById(id);
  if (!existing) throw new AppError('活动不存在', 'NOT_FOUND');
  await repo.updateEvent(["status = 'deleted'", "updated_at = datetime('now')"], [], id);
  await logAdminAction(operatorId, 'events.delete', id, { targetType: 'event' });
}

/** 管理员批量更新活动状态 */
export async function batchUpdateEvents(
  operatorId: string,
  eventIds: string[],
  updates: { status: string },
): Promise<{ updated: number; eventIds: string[] }> {
  const repo = getEventsRepository();
  const engine = await getDbEngine();
  const updated = await engine.transaction(async (tx) => {
    let count = 0;
    for (const id of eventIds) {
      const existing = await repo.getEventById(id, tx);
      if (!existing) continue;
      await repo.updateEvent(['status = ?', "updated_at = datetime('now')"], [updates.status], id, tx);
      count++;
    }
    return count;
  });
  await logAdminAction(operatorId, 'events.batch.update', eventIds.join(','), {
    targetType: 'event',
    status: updates.status,
    count: updated,
  });
  return { updated, eventIds };
}
