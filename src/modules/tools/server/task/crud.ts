/**
 * @file 任务 CRUD 服务
 */

import crypto from 'node:crypto';
import { getDbEngine } from '@/shared/db/drivers';
import { getToolsRepository } from '@/shared/db/repositories';
import { AppError } from '@/shared/app-error';
import { logAdminAction } from '@/shared/security/audit';
import type { QueryParams } from '@/shared/db/drivers';
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
export async function createTask(adminId: string, input: TaskInput): Promise<Task> {
  const err = validateTaskInput(input);
  if (err) throw new AppError(err, 'VALIDATION_ERROR');

  const repo = getToolsRepository();
  const engine = await getDbEngine();
  const id = crypto.randomUUID();
  const tagsStr = input.tags?.length ? JSON.stringify(input.tags) : '[]';

  await engine.transaction(async (tx) => {
    await repo.insertTask(tx, {
      id,
      title: input.title.trim(),
      description: input.description.trim(),
      contentMarkdown: input.contentMarkdown?.trim() || null,
      category: input.category || 'general',
      tags: tagsStr,
      points: input.points ?? 10,
      maxClaimants: input.maxClaimants ?? 1,
      createdBy: adminId,
    });
  });

  logAdminAction(adminId, 'task_create', null, { taskId: id, title: input.title.trim() });

  const row = await repo.getTaskById(id);
  return toTask(row as TaskRow, 0);
}

/** 更新任务 */
export async function updateTask(adminId: string, taskId: string, input: Partial<TaskInput>): Promise<Task> {
  const repo = getToolsRepository();
  const existing = await repo.getTaskById(taskId);
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

  await repo.updateTaskFields(taskId, {
    title: merged.title.trim(),
    description: merged.description.trim(),
    contentMarkdown: merged.contentMarkdown?.trim() || null,
    category: merged.category || 'general',
    tags: tagsStr,
    points: merged.points ?? 10,
    maxClaimants: merged.maxClaimants ?? 1,
  });

  logAdminAction(adminId, 'task_update', null, { taskId });

  const row = await repo.getTaskById(taskId);
  const claimCount = await repo.getTaskClaimCount(taskId, 'active');
  return toTask(row as TaskRow, claimCount);
}

/** 发布任务 */
export async function publishTask(adminId: string, taskId: string): Promise<Task> {
  const repo = getToolsRepository();
  const existing = await repo.getTaskById(taskId);
  if (!existing) throw new AppError('任务不存在', 'NOT_FOUND');
  if (existing.status !== 'draft') throw new AppError('只能发布草稿状态的任务', 'INVALID_STATUS');

  await repo.updateTaskFields(taskId, { status: 'published', publishedAt: new Date().toISOString() });

  logAdminAction(adminId, 'task_publish', null, { taskId });

  const row = await repo.getTaskById(taskId);
  return toTask(row as TaskRow, 0);
}

/** 关闭任务 */
export async function closeTask(adminId: string, taskId: string): Promise<Task> {
  const repo = getToolsRepository();
  const existing = await repo.getTaskById(taskId);
  if (!existing) throw new AppError('任务不存在', 'NOT_FOUND');
  if (existing.status !== 'published') throw new AppError('只能关闭已发布的任务', 'INVALID_STATUS');

  await repo.updateTaskFields(taskId, { status: 'closed', closedAt: new Date().toISOString() });

  logAdminAction(adminId, 'task_close', null, { taskId });

  const row = await repo.getTaskById(taskId);
  const claimCount = await repo.getTaskClaimCount(taskId, 'completed');
  return toTask(row as TaskRow, claimCount);
}

/** 删除任务 */
export async function deleteTask(adminId: string, taskId: string): Promise<void> {
  const repo = getToolsRepository();
  const existing = await repo.getTaskById(taskId);
  if (!existing) throw new AppError('任务不存在', 'NOT_FOUND');

  logAdminAction(adminId, 'task_delete', null, { taskId, title: existing.title });
  await repo.deleteTask(taskId);
}

/** 根据 ID 获取任务 */
export async function getTaskById(taskId: string): Promise<Task | null> {
  const repo = getToolsRepository();
  const row = await repo.getTaskById(taskId);
  if (!row) return null;

  const claimCount = await repo.getTaskClaimCount(taskId, 'active');
  return toTask(row, claimCount);
}

/** 列出任务列表 */
export async function listTasks(opts: TaskListOptions = {}): Promise<{ tasks: Task[]; total: number }> {
  const repo = getToolsRepository();
  const conditions: string[] = [];
  const params: QueryParams = [];

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

  const total = await repo.countTasks(where, params);

  const rows = await repo.listTasks(where, [...params, pageSize, offset] as QueryParams);

  const tasks = await Promise.all(rows.map(async (row) => {
    const claimCount = await repo.getTaskClaimCount(row.id, 'active');
    return toTask(row, claimCount);
  }));

  return { tasks, total };
}
