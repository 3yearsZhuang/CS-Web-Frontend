/**
 * @file 忘记密码申请-审批服务 — 用户提交申请，管理员批准（重置为默认密码）/拒绝
 *
 * 申请免登录但需邮箱校验 + 速率限制；批准/拒绝须管理员；重置后 session 全失效；全程审计。
 */
import crypto from 'node:crypto';
import { AppError } from '@/shared/app-error';
import { getDb, cleanupExpiredData } from '@/shared/db';
import { hashPassword } from '@/shared/security/password';
import { toSafeUser, type SafeUser, type UserRow } from '@/shared/types';
import { logAdminAction } from '@/shared/security/audit';

/** 密码重置申请状态 */
export type ResetRequestStatus = 'pending' | 'approved' | 'rejected';

/** 读取默认重置密码 — 运行时读取避免 dev 模块重载值不一致；必须配置环境变量 */
function getDefaultResetPassword(): string {
  const pwd = process.env.PASSWORD_RESET_DEFAULT;
  if (!pwd) {
    throw new AppError(
      '未配置 PASSWORD_RESET_DEFAULT 环境变量，无法执行默认密码重置',
      'VALIDATION_ERROR',
    );
  }
  return pwd;
}

/** password_reset_requests 行结构 */
interface ResetRequestRow {
  id: string;
  email: string;
  status: string;
  admin_id: string | null;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

/** 对外密码重置申请对象 */
export interface PasswordResetRequest {
  id: string;
  email: string;
  status: ResetRequestStatus;
  adminId: string | null;
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

/** 将 DB 行转换为对外对象（snake_case → camelCase） */
function toResetRequest(row: ResetRequestRow): PasswordResetRequest {
  return {
    id: row.id,
    email: row.email,
    status: row.status as ResetRequestStatus,
    adminId: row.admin_id,
    adminNote: row.admin_note,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
}

/** 创建忘记密码申请 — 已有 pending 申请时直接返回已有 id */
export function createResetRequest(email: string): { id: string } {
  const db = getDb();
  const normalizedEmail = email.toLowerCase();

  cleanupExpiredData(db);

  const existing = db
    .prepare(
      `SELECT id FROM password_reset_requests
       WHERE email = ? AND status = 'pending'
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(normalizedEmail) as { id: string } | undefined;

  if (existing) {
    return { id: existing.id };
  }

  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO password_reset_requests (id, email) VALUES (?, ?)',
  ).run(id, normalizedEmail);

  return { id };
}

/** 列出密码重置申请 — 先清理过期数据；status 可选筛选 */
export function listResetRequests(
  status?: ResetRequestStatus,
): PasswordResetRequest[] {
  const db = getDb();
  cleanupExpiredData(db);
  if (status) {
    const rows = db
      .prepare(
        'SELECT * FROM password_reset_requests WHERE status = ? ORDER BY created_at DESC',
      )
      .all(status) as ResetRequestRow[];
    return rows.map(toResetRequest);
  }
  const rows = db
    .prepare('SELECT * FROM password_reset_requests ORDER BY created_at DESC')
    .all() as ResetRequestRow[];
  return rows.map(toResetRequest);
}

/** 管理员批准密码重置申请 — 抛 NOT_FOUND / ALREADY_PROCESSED / SELF_APPROVE（禁批准自己邮箱防接管）；成功返回重置后的 SafeUser */
export function approveResetRequest(
  adminId: string,
  requestId: string,
  note?: string,
): SafeUser {
  const db = getDb();

  cleanupExpiredData(db);

  const req = db
    .prepare('SELECT * FROM password_reset_requests WHERE id = ?')
    .get(requestId) as ResetRequestRow | undefined;
  if (!req) {
    throw new AppError('申请不存在', 'NOT_FOUND');
  }

  if (req.status !== 'pending') {
    throw new AppError('该申请已被处理', 'ALREADY_PROCESSED');
  }

  const userRow = db.prepare('SELECT * FROM users WHERE email = ?').get(req.email) as
    | UserRow
    | undefined;
  if (!userRow) {
    throw new AppError('用户不存在', 'NOT_FOUND');
  }

  if (userRow.id === adminId) {
    throw new AppError('不能批准自己的密码重置申请', 'SELF_APPROVE');
  }

  const passwordHash = hashPassword(getDefaultResetPassword());
  // 事务包裹：密码更新 + session 失效 + 申请状态更新必须原子
  db.transaction(() => {
    db.prepare(
      "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
    ).run(passwordHash, userRow.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userRow.id);
    db.prepare(
      `UPDATE password_reset_requests
       SET status = 'approved', admin_id = ?, admin_note = ?, resolved_at = datetime('now')
       WHERE id = ?`,
    ).run(adminId, note ?? null, requestId);
  })();

  logAdminAction(adminId, 'approve_password_reset', userRow.id, {
    requestId,
    email: req.email,
    note: note ?? null,
  });

  const refreshed = db.prepare('SELECT * FROM users WHERE id = ?').get(userRow.id) as UserRow;
  return toSafeUser(refreshed);
}

/** 管理员拒绝密码重置申请 — 抛 Error('NOT_FOUND' | 'ALREADY_PROCESSED') */
export function rejectResetRequest(
  adminId: string,
  requestId: string,
  note?: string,
): void {
  const db = getDb();

  const req = db
    .prepare('SELECT * FROM password_reset_requests WHERE id = ?')
    .get(requestId) as ResetRequestRow | undefined;
  if (!req) {
    throw new AppError('申请不存在', 'NOT_FOUND');
  }

  if (req.status !== 'pending') {
    throw new AppError('该申请已被处理', 'ALREADY_PROCESSED');
  }

  db.prepare(
    `UPDATE password_reset_requests
     SET status = 'rejected', admin_id = ?, admin_note = ?, resolved_at = datetime('now')
     WHERE id = ?`,
  ).run(adminId, note ?? null, requestId);

  logAdminAction(adminId, 'reject_password_reset', null, {
    requestId,
    email: req.email,
    note: note ?? null,
  });
}
