/**
 * @file 管理员操作审计日志 — 写入/查询/删除
 *
 * deleteAdminAction(s) 仅 root 可调用；删除操作本身也记审计日志（自我审计）。
 */
import { AppError } from '@/shared/app-error';
import { getAdminRepository, type AdminActionWithAdmin } from '@/shared/db/repositories';
import type { QueryParams } from '@/shared/db/drivers';
import { logAdminAction, type AuditContext } from '@/shared/security/audit';
import type { AdminAction } from '../types';

export { logAdminAction, type AuditContext };
export type { AdminAction };

function toAdminAction(row: AdminActionWithAdmin): AdminAction {
  return {
    id: row.id,
    adminId: row.admin_id,
    adminEmail: row.admin_email,
    adminDisplayName: row.admin_display_name,
    action: row.action,
    targetUserId: row.target_user_id,
    targetEmail: row.target_email,
    targetDisplayName: row.target_display_name,
    details: row.details,
    ip: row.ip,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  };
}

/** 查询管理员操作审计日志 — 可按 adminId/action 过滤，limit 上限 200 */
export async function listAdminActions(
  adminId?: string,
  limit = 50,
  action?: string,
): Promise<AdminAction[]> {
  const repo = getAdminRepository();
  const safeLimit = Math.min(Math.max(1, limit), 200);

  const conditions: string[] = [];
  const args: QueryParams = [];
  if (adminId) {
    conditions.push('aa.admin_id = ?');
    args.push(adminId);
  }
  if (action) {
    conditions.push('aa.action = ?');
    args.push(action);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = await repo.listAdminActions(where, [...args, safeLimit, 0] as QueryParams);

  return rows.map(toAdminAction);
}

/** 删除单条审计日志 — 仅 root 可调用；删除会再记一条 delete_log 审计；不存在抛 NOT_FOUND */
export async function deleteAdminAction(adminId: string, actionId: string, auditCtx?: AuditContext): Promise<void> {
  const repo = getAdminRepository();
  const target = await repo.getAdminActionById(actionId);
  if (!target) {
    throw new AppError('日志不存在', 'NOT_FOUND');
  }

  await repo.deleteAdminAction(actionId);

  await logAdminAction(adminId, 'delete_log', null, {
    deletedActionId: actionId,
    deletedAction: target.action,
  }, auditCtx?.ip, auditCtx?.userAgent);
}

/**
 * 批量删除早于指定时间的审计日志 — 仅 root 可调用，返回删除数
 *
 * before 可能是 ISO 8601（T 分隔）而 created_at 是 SQLite datetime（空格分隔），
 * 直接字符串比较会错乱，两侧用 datetime() 归一化。
 */
export async function deleteAdminActionsBefore(adminId: string, before: string, auditCtx?: AuditContext): Promise<number> {
  const repo = getAdminRepository();
  const count = await repo.deleteAdminActionsBefore(before);

  await logAdminAction(adminId, 'delete_log', null, {
    before,
    deletedCount: count,
  }, auditCtx?.ip, auditCtx?.userAgent);

  return count;
}