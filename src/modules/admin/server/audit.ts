/**
 * @file 管理员操作审计日志 — 写入/查询/删除
 *
 * deleteAdminAction(s) 仅 root 可调用；删除操作本身也记审计日志（自我审计）。
 */
import { AppError } from '@/shared/app-error';
import { getDb } from '@/shared/db';
import { logAdminAction, type AuditContext } from '@/shared/security/audit';
import type { AdminAction } from '../types';

export { logAdminAction, type AuditContext };
export type { AdminAction };

/** 查询管理员操作审计日志 — 可按 adminId/action 过滤，limit 上限 200 */
export function listAdminActions(
  adminId?: string,
  limit = 50,
  action?: string,
): AdminAction[] {
  const db = getDb();
  const safeLimit = Math.min(Math.max(1, limit), 200);

  const conditions: string[] = [];
  const args: unknown[] = [];
  if (adminId) {
    conditions.push('aa.admin_id = ?');
    args.push(adminId);
  }
  if (action) {
    conditions.push('aa.action = ?');
    args.push(action);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = db
    .prepare(
      `SELECT
        aa.id,
        aa.admin_id AS adminId,
        ua.email AS adminEmail,
        ua.display_name AS adminDisplayName,
        aa.action,
        aa.target_user_id AS targetUserId,
        ut.email AS targetEmail,
        ut.display_name AS targetDisplayName,
        aa.details,
        aa.ip,
        aa.user_agent AS userAgent,
        aa.created_at AS createdAt
      FROM admin_actions aa
      LEFT JOIN users ua ON aa.admin_id = ua.id
      LEFT JOIN users ut ON aa.target_user_id = ut.id
      ${where}
      ORDER BY aa.created_at DESC
      LIMIT ?`,
    )
    .all(...args, safeLimit) as AdminAction[];

  return rows;
}

/** 删除单条审计日志 — 仅 root 可调用；删除会再记一条 delete_log 审计；不存在抛 NOT_FOUND */
export function deleteAdminAction(adminId: string, actionId: string, auditCtx?: AuditContext): void {
  const db = getDb();
  const target = db.prepare('SELECT id, action, target_user_id, details FROM admin_actions WHERE id = ?').get(actionId) as
    | { id: string; action: string; target_user_id: string | null; details: string | null }
    | undefined;
  if (!target) {
    throw new AppError('日志不存在', 'NOT_FOUND');
  }

  db.prepare('DELETE FROM admin_actions WHERE id = ?').run(actionId);

  logAdminAction(adminId, 'delete_log', null, {
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
export function deleteAdminActionsBefore(adminId: string, before: string, auditCtx?: AuditContext): number {
  const db = getDb();
  const result = db.prepare('DELETE FROM admin_actions WHERE datetime(created_at) < datetime(?)').run(before);
  const count = result.changes;

  logAdminAction(adminId, 'delete_log', null, {
    before,
    deletedCount: count,
  }, auditCtx?.ip, auditCtx?.userAgent);

  return count;
}