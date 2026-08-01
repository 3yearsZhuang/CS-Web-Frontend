/**
 * @file 任务认领审核服务
 */

import { getDb } from '@/shared/db';
import { AppError } from '@/shared/app-error';
import { logAdminAction } from '@/shared/security/audit';
import { addPoints } from '../points';
import { type TaskRow } from './crud';
import { type ClaimRow, toClaim } from './claims';
import { type TaskClaim } from '../../types';

/** 管理员审核认领 */
export function reviewClaim(adminId: string, claimId: string, approved: boolean, note?: string): TaskClaim {
  const db = getDb();
  const claim = db.prepare('SELECT * FROM task_claims WHERE id = ?').get(claimId) as ClaimRow | undefined;
  if (!claim) throw new AppError('认领不存在', 'NOT_FOUND');
  if (claim.status !== 'claimed') throw new AppError('该认领已处理', 'INVALID_STATUS');

  if (approved) {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(claim.task_id) as TaskRow | undefined;
    const points = task?.points ?? 0;

    db.prepare(
      "UPDATE task_claims SET status = 'completed', completed_at = datetime('now'), reviewed_by = ?, review_note = ? WHERE id = ?",
    ).run(adminId, note?.trim() || null, claimId);

    if (points > 0) {
      addPoints(claim.user_id, points, 'task_reward', claim.task_id, `完成任务：${task?.title ?? '未知任务'}`);
    }

    logAdminAction(adminId, 'task_review_approve', claim.user_id, { claimId, taskId: claim.task_id, points });
  } else {
    db.prepare(
      "UPDATE task_claims SET status = 'cancelled', reviewed_by = ?, review_note = ? WHERE id = ?",
    ).run(adminId, note?.trim() || null, claimId);

    logAdminAction(adminId, 'task_review_reject', claim.user_id, { claimId, taskId: claim.task_id });
  }

  const updated = db.prepare('SELECT * FROM task_claims WHERE id = ?').get(claimId) as ClaimRow;
  return toClaim(updated);
}
