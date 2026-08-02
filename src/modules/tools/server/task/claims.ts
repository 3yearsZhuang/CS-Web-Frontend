/**
 * @file 任务认领服务
 */

import crypto from 'node:crypto';
import { getDbEngine } from '@/shared/db/drivers';
import { getToolsRepository } from '@/shared/db/repositories';
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
export async function claimTask(userId: string, taskId: string, note?: string): Promise<TaskClaim> {
  const repo = getToolsRepository();
  const engine = await getDbEngine();

  const task = await repo.getTaskById(taskId);
  if (!task) throw new AppError('任务不存在', 'NOT_FOUND');
  if (task.status !== 'published') throw new AppError('任务未开放认领', 'INVALID_STATUS');

  const currentClaims = await repo.getTaskClaimCount(taskId, 'active');
  if (currentClaims >= task.max_claimants) throw new AppError('认领已达上限', 'CLAIM_LIMIT');

  const existing = await repo.getTaskClaim(taskId, userId);
  if (existing) {
    if (existing.status === 'cancelled') {
      await repo.reactivateClaim(existing.id, note?.trim() || null);
      const updated = await repo.getTaskClaimById(existing.id);
      return toClaim(updated as ClaimRow);
    }
    throw new AppError('你已经认领过该任务', 'ALREADY_CLAIMED');
  }

  const id = crypto.randomUUID();
  await engine.transaction(async (tx) => {
    await repo.insertTaskClaim(tx, id, taskId, userId, note?.trim() || null);
  });

  const row = await repo.getTaskClaimById(id);
  return toClaim(row as ClaimRow);
}

/** 用户取消认领 */
export async function cancelClaim(userId: string, claimId: string): Promise<void> {
  const repo = getToolsRepository();
  const owned = await repo.getTaskClaimById(claimId);
  if (!owned || owned.user_id !== userId) throw new AppError('认领不存在', 'NOT_FOUND');
  if (owned.status !== 'claimed') throw new AppError('只能取消未完成的认领', 'INVALID_STATUS');

  await repo.updateClaimStatus(claimId, 'cancelled');
}

/** 用户按任务取消自己的认领（查找该任务下本人活跃认领并取消） */
export async function cancelClaimByTask(userId: string, taskId: string): Promise<void> {
  const repo = getToolsRepository();
  const claimRow = await repo.getClaimByTaskAndUser(taskId, userId, 'claimed');
  if (!claimRow) throw new AppError('认领不存在', 'NOT_FOUND');
  await cancelClaim(userId, claimRow.id);
}

/** 获取用户的认领列表 */
export async function getUserClaims(userId: string): Promise<TaskClaim[]> {
  const repo = getToolsRepository();
  const rows = await repo.getUserClaims(userId);
  return rows.map((r) => toClaim(r as ClaimRow & { display_name?: string | null }));
}

/** 获取某个任务的认领列表 */
export async function getTaskClaims(taskId: string): Promise<TaskClaim[]> {
  const repo = getToolsRepository();
  const rows = await repo.getTaskClaims(taskId);
  return rows.map((r) => toClaim(r as ClaimRow & { display_name?: string | null }));
}

/** 列出待审核的认领 */
export async function listPendingClaims(): Promise<TaskClaim[]> {
  const repo = getToolsRepository();
  const rows = await repo.listPendingClaims();
  return rows.map((r) => toClaim(r as ClaimRow & { display_name?: string | null }));
}
