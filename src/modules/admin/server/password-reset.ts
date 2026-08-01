/**
 * @file 管理员重置用户密码 — 默认密码（admin/root）/ 自定义密码（仅 root）
 *
 * 重置后 session 全失效；普通管理员不可重置其他管理员/root 密码；审计不记密码本身。
 */
import { AppError } from '@/shared/app-error';
import { getDb } from '@/shared/db';
import { hashPassword } from '@/shared/security';
import { isAdminRole } from '@/shared/types';
import { PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH } from '@/modules/auth/types/constants';
import { logAdminAction } from './audit';
import type { AuditContext } from '../types';

/** 重置用户密码为默认密码 — admin/root 均可；普通管理员不可重置其他管理员密码；重置后 session 失效；抛 NOT_FOUND/FORBIDDEN */
export function resetUserPasswordDefault(adminId: string, targetUserId: string, auditCtx?: AuditContext): void {
  const db = getDb();
  const admin = db.prepare('SELECT role FROM users WHERE id = ?').get(adminId) as
    | { role: string }
    | undefined;
  if (!admin) {
    throw new AppError('操作者不存在', 'NOT_FOUND');
  }
  const isAdminOperator = admin.role !== 'root';

  const target = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(targetUserId) as
    | { id: string; email: string; role: string }
    | undefined;
  if (!target) {
    throw new AppError('用户不存在', 'NOT_FOUND');
  }

  if (isAdminOperator && isAdminRole(target.role)) {
    throw new AppError('普通管理员不可重置其他管理员的密码', 'FORBIDDEN');
  }

  // 统一读取 PASSWORD_RESET_DEFAULT 环境变量（与 auth 模块一致），移除源码公开的硬编码弱口令回退
  const defaultPassword = process.env.PASSWORD_RESET_DEFAULT;
  if (!defaultPassword) {
    throw new AppError(
      '未配置 PASSWORD_RESET_DEFAULT 环境变量，无法执行默认密码重置',
      'VALIDATION_ERROR',
    );
  }
  const passwordHash = hashPassword(defaultPassword);
  // 事务包裹：密码更新 + session 失效必须原子，避免进程崩溃致旧 session 残留
  db.transaction(() => {
    db.prepare(
      "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
    ).run(passwordHash, targetUserId);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(targetUserId);
  })();

  logAdminAction(adminId, 'reset_password_default', targetUserId, { email: target.email }, auditCtx?.ip, auditCtx?.userAgent);
}

/** 重置用户密码为自定义密码 — 仅 root；root 账号不可被重置；密码长度 6-1024；重置后 session 失效；抛 VALIDATION_ERROR/NOT_FOUND/ROOT_PROTECTED */
export function resetUserPasswordCustom(
  adminId: string,
  targetUserId: string,
  newPassword: string,
  auditCtx?: AuditContext,
): void {
  if (
    typeof newPassword !== 'string' ||
    newPassword.length < PASSWORD_MIN_LENGTH ||
    newPassword.length > PASSWORD_MAX_LENGTH
  ) {
    throw new AppError(
      `密码长度必须在 ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} 之间`,
      'VALIDATION_ERROR',
    );
  }

  const db = getDb();
  const target = db.prepare('SELECT id, email, role FROM users WHERE id = ?').get(targetUserId) as
    | { id: string; email: string; role: string }
    | undefined;
  if (!target) {
    throw new AppError('用户不存在', 'NOT_FOUND');
  }

  if (target.role === 'root') {
    throw new AppError('超级管理员账号不可被重置密码', 'ROOT_PROTECTED');
  }

  const passwordHash = hashPassword(newPassword);
  // 事务包裹：密码更新 + session 失效必须原子（与 resetUserPasswordDefault 一致）
  db.transaction(() => {
    db.prepare(
      "UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?",
    ).run(passwordHash, targetUserId);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(targetUserId);
  })();

  logAdminAction(adminId, 'reset_password_custom', targetUserId, { email: target.email }, auditCtx?.ip, auditCtx?.userAgent);
}