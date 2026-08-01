/**
 * @file 任务认领服务
 */

import crypto from 'node:crypto';
import { getDb } from '@/shared/db';
import { AppError } from '@/shared/app-error';
import { type TaskRow } from './crud';
import {
  type ClaimStatus,
  type TaskClaim,
} from '../../types';

export interface ClaimRow {
  id: string;
  task_id: string;
  user_id: string;
  status: string;
  claim_note: string | null;
  completed_at: string | null;
  reviewed_by: string | null;
  review_note: string | null;
  created_at: string;
}

/** 将认领数据库行转换为 TaskClaim 对象 */
export function toClaim(row: ClaimRow & { display_name?: string | null }): TaskClaim {
  return {
    id: row.id,
    taskId: row.task_id,
    userId: row.user_id,
    status: row.status as ClaimStatus,
    claimNote: row.claim_note,
    completedAt: row.completed_at,
    reviewedBy: row.reviewed_by,
    reviewNote: row.review_note,
    createdAt: row.created_at,
    displayName: row.display_name ?? undefined,
  };
}

/** 用户认领任务 */
export function claimTask(userId: string, taskId: string, note?: string): TaskClaim {
  const db = getDb();

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId) as TaskRow | undefined;
  if (!task) throw new AppError('任务不存在', 'NOT_FOUND');
  if (task.status !== 'published') throw new AppError('任务未开放认领', 'INVALID_STATUS');

  const currentClaims = (db.prepare('SELECT COUNT(*) AS c FROM task_claims WHERE task_id = ? AND status != ?').get(taskId, 'cancelled') as { c: number }).c;
  if (currentClaims >= task.max_claimants) throw new AppError('认领已达上限', 'CLAIM_LIMIT');

  const existing = db.prepare('SELECT * FROM task_claims WHERE task_id = ? AND user_id = ?').get(taskId, userId) as ClaimRow | undefined;
  if (existing) {
    if (existing.status === 'cancelled') {
      db.prepare(
        `UPDATE task_claims SET status = 'claimed', claim_note = ?, created_at = datetime('now') WHERE id = ?`,
      ).run(note?.trim() || null, existing.id);
      const updated = db.prepare('SELECT * FROM task_claims WHERE id = ?').get(existing.id) as ClaimRow;
      return toClaim(updated);
    }
    throw new AppError('你已经认领过该任务', 'ALREADY_CLAIMED');
  }

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO task_claims (id, task_id, user_id, claim_note) VALUES (?, ?, ?, ?)`,
  ).run(id, taskId, userId, note?.trim() || null);

  const row = db.prepare('SELECT * FROM task_claims WHERE id = ?').get(id) as ClaimRow;
  return toClaim(row);
}

/** 用户取消认领 */
export function cancelClaim(userId: string, claimId: string): void {
  const db = getDb();
  const claim = db.prepare('SELECT * FROM task_claims WHERE id = ? AND user_id = ?').get(claimId, userId) as ClaimRow | undefined;
  if (!claim) throw new AppError('认领不存在', 'NOT_FOUND');
  if (claim.status !== 'claimed') throw new AppError('只能取消未完成的认领', 'INVALID_STATUS');

  db.prepare("UPDATE task_claims SET status = 'cancelled' WHERE id = ?").run(claimId);
}

/** 用户按任务取消自己的认领（查找该任务下本人活跃认领并取消） */
export function cancelClaimByTask(userId: string, taskId: string): void {
  const db = getDb();
  const claimRow = db
    .prepare('SELECT id FROM task_claims WHERE task_id = ? AND user_id = ? AND status = ?')
    .get(taskId, userId, 'claimed') as { id: string } | undefined;
  if (!claimRow) throw new AppError('认领不存在', 'NOT_FOUND');
  cancelClaim(userId, claimRow.id);
}

/** 获取用户的认领列表 */
export function getUserClaims(userId: string): TaskClaim[] {
  const db = getDb();
  const rows = db.prepare(
    `SELECT tc.*, u.display_name
     FROM task_claims tc
     LEFT JOIN users u ON tc.reviewed_by = u.id
     WHERE tc.user_id = ?
     ORDER BY tc.created_at DESC`,
  ).all(userId) as Array<ClaimRow & { display_name: string | null }>;

  return rows.map((r) => toClaim(r));
}

/** 获取某个任务的认领列表 */
export function getTaskClaims(taskId: string): TaskClaim[] {
  const db = getDb();
  const rows = db.prepare(
    `SELECT tc.*, u.display_name
     FROM task_claims tc
     LEFT JOIN users u ON tc.user_id = u.id
     WHERE tc.task_id = ?
     ORDER BY tc.created_at DESC`,
  ).all(taskId) as Array<ClaimRow & { display_name: string | null }>;

  return rows.map((r) => toClaim(r));
}

/** 列出待审核的认领 */
export function listPendingClaims(): TaskClaim[] {
  const db = getDb();
  const rows = db.prepare(
    `SELECT tc.*, u.display_name
     FROM task_claims tc
     LEFT JOIN users u ON tc.user_id = u.id
     WHERE tc.status = 'claimed'
     ORDER BY tc.created_at ASC`,
  ).all() as Array<ClaimRow & { display_name: string | null }>;

  return rows.map((r) => toClaim(r));
}
