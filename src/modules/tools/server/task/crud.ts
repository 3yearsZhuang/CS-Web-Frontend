/**
 * @file 任务 CRUD 服务
 */

import crypto from 'node:crypto';
import { getDb } from '@/shared/db';
import { AppError } from '@/shared/app-error';
import { logAdminAction } from '@/shared/security/audit';
import {
  type TaskStatus,
  type TaskCategory,
  type TaskInput,
  type Task,
  type TaskListOptions,
} from '../../types';

export interface TaskRow {
  id: string;
  title: string;
  description: string;
  content_markdown: string | null;
  category: string;
  tags: string;
  points: number;
  max_claimants: number;
  status: string;
  created_by: string;
  published_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

const VALID_CATEGORIES: TaskCategory[] = ['general', 'documentation', 'event', 'maintenance', 'mentoring', 'other'];

function toTask(row: TaskRow, claimCount: number): Task {
  let tags: string[] = [];
  try {
    tags = JSON.parse(row.tags) as string[];
  } catch { /* ignore */ }

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    contentMarkdown: row.content_markdown,
    category: (row.category as TaskCategory) || 'general',
    tags,
    points: row.points,
    maxClaimants: row.max_claimants,
    status: row.status as TaskStatus,
    createdBy: row.created_by,
    publishedAt: row.published_at,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    claimCount,
  };
}

function validateTaskInput(input: TaskInput): string | null {
  if (!input.title || input.title.trim().length === 0) return '任务标题不能为空';
  if (input.title.trim().length > 200) return '任务标题不能超过 200 字';
  if (!input.description || input.description.trim().length === 0) return '任务描述不能为空';
  if (input.category && !VALID_CATEGORIES.includes(input.category)) return `分类必须为 ${VALID_CATEGORIES.join(' / ')}`;
  if (input.points !== undefined && (input.points < 0 || input.points > 100)) return '积分奖励必须在 0-100 之间';
  if (input.maxClaimants !== undefined && (input.maxClaimants < 1 || input.maxClaimants > 50)) return '认领上限必须在 1-50 之间';
  return null;
}

/** 创建任务 */
export function createTask(adminId: string, input: TaskInput): Task {
  const err = validateTaskInput(input);
  if (err) throw new AppError(err, 'VALIDATION_ERROR');

  const db = getDb();
  const id = crypto.randomUUID();
  const tagsStr = input.tags?.length ? JSON.stringify(input.tags) : '[]';

  db.prepare(
    `INSERT INTO tasks (id, title, description, content_markdown, category, tags, points, max_claimants, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.title.trim(),
    input.description.trim(),
    input.contentMarkdown?.trim() || null,
    input.category || 'general',
    tagsStr,
    input.points ?? 10,
    input.maxClaimants ?? 1,
    adminId,
  );

  logAdminAction(adminId, 'task_create', null, { taskId: id, title: input.title.trim() });

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow;
  return toTask(row, 0);
}

/** 更新任务 */
export function updateTask(adminId: string, taskId: string, input: Partial<TaskInput>): Task {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as TaskRow | undefined;
  if (!existing) throw new AppError('任务不存在', 'NOT_FOUND');

  const merged: TaskInput = {
    title: input.title ?? existing.title,
    description: input.description ?? existing.description,
    contentMarkdown: input.contentMarkdown !== undefined ? input.contentMarkdown : existing.content_markdown ?? undefined,
    category: (input.category as TaskCategory | undefined) ?? (existing.category as TaskCategory),
    tags: input.tags ?? (() => { try { return JSON.parse(existing.tags); } catch { return []; } })(),
    points: input.points ?? existing.points,
    maxClaimants: input.maxClaimants ?? existing.max_claimants,
  };

  const err = validateTaskInput(merged);
  if (err) throw new AppError(err, 'VALIDATION_ERROR');

  const tagsStr = merged.tags?.length ? JSON.stringify(merged.tags) : '[]';

  db.prepare(
    `UPDATE tasks SET title = ?, description = ?, content_markdown = ?, category = ?, tags = ?, points = ?, max_claimants = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(
    merged.title.trim(),
    merged.description.trim(),
    merged.contentMarkdown?.trim() || null,
    merged.category || 'general',
    tagsStr,
    merged.points ?? 10,
    merged.maxClaimants ?? 1,
    taskId,
  );

  logAdminAction(adminId, 'task_update', null, { taskId });

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as TaskRow;
  const claimCount = (db.prepare('SELECT COUNT(*) AS c FROM task_claims WHERE task_id = ? AND status != ?').get(taskId, 'cancelled') as { c: number }).c;
  return toTask(row, claimCount);
}

/** 发布任务 */
export function publishTask(adminId: string, taskId: string): Task {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as TaskRow | undefined;
  if (!existing) throw new AppError('任务不存在', 'NOT_FOUND');
  if (existing.status !== 'draft') throw new AppError('只能发布草稿状态的任务', 'INVALID_STATUS');

  db.prepare(
    `UPDATE tasks SET status = 'published', published_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
  ).run(taskId);

  logAdminAction(adminId, 'task_publish', null, { taskId });

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as TaskRow;
  return toTask(row, 0);
}

/** 关闭任务 */
export function closeTask(adminId: string, taskId: string): Task {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as TaskRow | undefined;
  if (!existing) throw new AppError('任务不存在', 'NOT_FOUND');
  if (existing.status !== 'published') throw new AppError('只能关闭已发布的任务', 'INVALID_STATUS');

  db.prepare(
    `UPDATE tasks SET status = 'closed', closed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
  ).run(taskId);

  logAdminAction(adminId, 'task_close', null, { taskId });

  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as TaskRow;
  const claimCount = (db.prepare('SELECT COUNT(*) AS c FROM task_claims WHERE task_id = ? AND status = ?').get(taskId, 'completed') as { c: number }).c;
  return toTask(row, claimCount);
}

/** 删除任务 */
export function deleteTask(adminId: string, taskId: string): void {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as TaskRow | undefined;
  if (!existing) throw new AppError('任务不存在', 'NOT_FOUND');

  logAdminAction(adminId, 'task_delete', null, { taskId, title: existing.title });
  db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
}

/** 根据 ID 获取任务 */
export function getTaskById(taskId: string): Task | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as TaskRow | undefined;
  if (!row) return null;

  const claimCount = (db.prepare('SELECT COUNT(*) AS c FROM task_claims WHERE task_id = ? AND status != ?').get(taskId, 'cancelled') as { c: number }).c;
  return toTask(row, claimCount);
}

/** 列出任务列表 */
export function listTasks(opts: TaskListOptions = {}): { tasks: Task[]; total: number } {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (opts.status) {
    conditions.push('status = ?');
    params.push(opts.status);
  }
  if (opts.category) {
    conditions.push('category = ?');
    params.push(opts.category);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const page = opts.page ?? 1;
  const pageSize = opts.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const total = (db.prepare(`SELECT COUNT(*) AS c FROM tasks ${where}`).all(...params) as Array<{ c: number }>)[0].c;

  const rows = db.prepare(
    `SELECT * FROM tasks ${where} ORDER BY published_at DESC NULLS LAST, created_at DESC LIMIT ? OFFSET ?`,
  ).all(...params, pageSize, offset) as TaskRow[];

  const tasks = rows.map((row) => {
    const claimCount = (db.prepare('SELECT COUNT(*) AS c FROM task_claims WHERE task_id = ? AND status != ?').get(row.id, 'cancelled') as { c: number }).c;
    return toTask(row, claimCount);
  });

  return { tasks, total };
}
