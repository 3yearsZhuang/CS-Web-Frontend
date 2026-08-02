/**
 * @file 任务认领审核服务
 */

import { getToolsRepository } from '@/shared/db/repositories';
import { AppError } from '@/shared/app-error';
import { logAdminAction } from '@/shared/security/audit';
import { addPoints } from '../points';
import { type TaskRow } from './crud';
import { type ClaimRow, toClaim } from './claims';
import { type TaskClaim } from '../../types';

/** 管理员审核认领 */
export async function reviewClaim(adminId: string, claimId: string, approved: boolean, note?: string): Promise<TaskClaim> {
  const repo = getToolsRepository();
  const claim = await repo.getTaskClaimById(claimId);
  if (!claim) throw new AppError('认领不存在', 'NOT_FOUND');
  if (claim.status !== 'claimed') throw new AppError('该认领已处理', 'INVALID_STATUS');

  if (approved) {
    const task = await repo.getTaskById(claim.task_id);
    const points = task?.points ?? 0;

    await repo.completeClaim(claimId, adminId, note?.trim() || null);

    if (points > 0) {
      await addPoints(claim.user_id, points, 'task_reward', claim.task_id, `完成任务：${task?.title ?? '未知任务'}`);
    }

    logAdminAction(adminId, 'task_review_approve', claim.user_id, { claimId, taskId: claim.task_id, points });
  } else {
    await repo.rejectClaim(claimId, adminId, note?.trim() || null);

    logAdminAction(adminId, 'task_review_reject', claim.user_id, { claimId, taskId: claim.task_id });
  }

  const updated = await repo.getTaskClaimById(claimId);
  return toClaim(updated as ClaimRow);
}
