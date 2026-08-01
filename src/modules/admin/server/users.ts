/**
 * @file 用户管理 — 列表/更新/禁用/删除
 *
 * root 专属操作由 requireRoot 守卫；root 账号不可降级/禁用/删除；管理员不能操作自己；
 * 删除用户级联清理 sessions 等；列表不返回 password_hash。
 */
import { AppError } from '@/shared/app-error';
import { getDb } from '@/shared/db';
import { toSafeUser, isAdminRole, type SafeUser, type UserRow } from '@/shared/types';
import { validateProfileFields, type ProfileFields } from '@/modules/user/types';
import { computePagination, computeTotalPages } from '@/shared/utils/pagination';
import { validateTechTags } from '@/shared/utils/tech-tags';
import { logAdminAction } from './audit';
import type { AuditContext } from '../types';
import type { AdminUserUpdate, ListUsersParams, UserListResult } from '../types';

export type { AdminUserUpdate, ListUsersParams, UserListResult };

/** 统计当前启用管理员数量 — 用于"最后管理员保护"，禁止降级/删除最后一个 active admin */
function countActiveAdmins(): number {
  const db = getDb();
  const row = db
    .prepare("SELECT COUNT(*) as cnt FROM users WHERE role IN ('admin', 'content_moderator', 'exam_admin', 'task_publisher') AND is_active = 1")
    .get() as { cnt: number };
  return row.cnt;
}

/** 列出所有用户（分页 + 搜索 + 筛选）— 不返回 password_hash */
export function listUsers(params: ListUsersParams = {}): UserListResult {
  const db = getDb();
  const {
    search,
    role = 'all',
    active = 'all',
    pageSize = 50,
    page = 1,
  } = params;

  const conditions: string[] = [];
  const args: unknown[] = [];

  if (search) {
    conditions.push('(email LIKE ? OR display_name LIKE ?)');
    const kw = `%${search}%`;
    args.push(kw, kw);
  }

  if (role !== 'all') {
    conditions.push('role = ?');
    args.push(role);
  }

  if (active === 'active') {
    conditions.push('is_active = 1');
  } else if (active === 'inactive') {
    conditions.push('is_active = 0');
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = (db.prepare(`SELECT COUNT(*) as cnt FROM users ${where}`).get(...args) as {
    cnt: number;
  }).cnt;

  const { page: safePage, pageSize: safePageSize, offset } = computePagination({
    page,
    pageSize,
    defaultPageSize: 50,
    maxPageSize: 200,
  });

  const rows = db
    .prepare(
      `SELECT * FROM users ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    )
    .all(...args, safePageSize, offset) as UserRow[];

  const totalPages = computeTotalPages(total, safePageSize);

  return {
    users: rows.map(toSafeUser),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  };
}

/** 获取单个用户（管理员查看） */
export function getUserById(userId: string): SafeUser | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as
    | UserRow
    | undefined;
  return row ? toSafeUser(row) : null;
}

/** 管理员更新用户 — 仅 root；root 不可被改、不可降级/禁用自己、不可动最后一个 admin；角色变更仅 user↔admin（不可提升为 root）；抛 VALIDATION_ERROR/NOT_FOUND/SELF_DEMOTE/SELF_DISABLE/LAST_ADMIN/ROOT_PROTECTED */
export function updateUserByAdmin(
  adminId: string,
  targetUserId: string,
  update: AdminUserUpdate,
  auditCtx?: AuditContext,
): SafeUser {
  const db = getDb();
  const target = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId) as
    | UserRow
    | undefined;
  if (!target) {
    throw new AppError('用户不存在', 'NOT_FOUND');
  }

  if (target.role === 'root') {
    throw new AppError('超级管理员账号不可被修改', 'ROOT_PROTECTED');
  }

  const sets: string[] = [];
  const values: unknown[] = [];
  const auditDetails: Record<string, unknown> = {};

  const fieldsValidation = validateProfileFields(update);
  if (!fieldsValidation.ok) {
    throw new AppError(fieldsValidation.error || '输入校验失败', 'VALIDATION_ERROR');
  }
  const clean = fieldsValidation.clean;
  if (clean.displayName !== undefined) {
    sets.push('display_name = ?');
    values.push(clean.displayName);
    auditDetails.displayName = clean.displayName;
  }
  if (clean.bio !== undefined) {
    sets.push('bio = ?');
    values.push(clean.bio);
    auditDetails.bio = clean.bio;
  }
  if (clean.githubUrl !== undefined) {
    sets.push('github_url = ?');
    values.push(clean.githubUrl);
    auditDetails.githubUrl = clean.githubUrl;
  }
  if (clean.websiteUrl !== undefined) {
    sets.push('website_url = ?');
    values.push(clean.websiteUrl);
    auditDetails.websiteUrl = clean.websiteUrl;
  }

  if (update.techTags !== undefined) {
    const tagsValidation = validateTechTags(update.techTags);
    if (!tagsValidation.ok) {
      throw new AppError(tagsValidation.error, 'VALIDATION_ERROR');
    }
    sets.push('tech_tags = ?');
    const tagsJson = JSON.stringify(tagsValidation.tags);
    values.push(tagsJson);
    auditDetails.techTags = tagsValidation.tags;
  }

  if (update.role !== undefined) {
    const validRoles = ['user', 'admin', 'content_moderator', 'exam_admin', 'task_publisher'];
    if (!validRoles.includes(update.role)) {
      throw new AppError(`角色必须为 ${validRoles.join(' / ')}`, 'VALIDATION_ERROR');
    }
    if (adminId === targetUserId && update.role !== target.role) {
      throw new AppError('不能修改自己的角色', 'SELF_DEMOTE');
    }
    if (
      update.role === 'user' &&
      isAdminRole(target.role) &&
      target.is_active === 1 &&
      countActiveAdmins() <= 1
    ) {
      throw new AppError('不能降级最后一个管理员，请先提升其他用户为管理员', 'LAST_ADMIN');
    }
    if (target.role !== update.role) {
      sets.push('role = ?');
      values.push(update.role);
      auditDetails.role = { from: target.role, to: update.role };
    }
  }

  if (update.isActive !== undefined) {
    const newActive = update.isActive ? 1 : 0;
    if (adminId === targetUserId && newActive === 0 && target.is_active === 1) {
      throw new AppError('不能禁用自己的账号', 'SELF_DISABLE');
    }
    if (
      newActive === 0 &&
      target.is_active === 1 &&
      isAdminRole(target.role) &&
      countActiveAdmins() <= 1
    ) {
      throw new AppError('不能禁用最后一个管理员，请先提升其他用户为管理员', 'LAST_ADMIN');
    }
    if (target.is_active !== newActive) {
      sets.push('is_active = ?');
      values.push(newActive);
      auditDetails.isActive = { from: target.is_active === 1, to: update.isActive };
    }
  }

  if (sets.length === 0) {
    return toSafeUser(target);
  }

  sets.push("updated_at = datetime('now')");
  values.push(targetUserId);

  db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId) as UserRow;

  logAdminAction(adminId, 'update_user', targetUserId, auditDetails, auditCtx?.ip, auditCtx?.userAgent);

  if (update.isActive === false && target.is_active === 1) {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(targetUserId);
  }

  return toSafeUser(updated);
}

/** 管理员禁用/启用用户 — admin/root 均可；普通管理员不可操作其他管理员；抛 NOT_FOUND/ROOT_PROTECTED/FORBIDDEN/SELF_DISABLE/LAST_ADMIN/NO_CHANGE */
export function setUserActiveByAdmin(
  adminId: string,
  targetUserId: string,
  active: boolean,
  auditCtx?: AuditContext,
): SafeUser {
  const db = getDb();
  const admin = db.prepare('SELECT role FROM users WHERE id = ?').get(adminId) as
    | { role: string }
    | undefined;
  if (!admin) {
    throw new AppError('操作者不存在', 'NOT_FOUND');
  }
  const isAdminOperator = admin.role !== 'root';

  const target = db.prepare('SELECT id, role, is_active FROM users WHERE id = ?').get(targetUserId) as
    | { id: string; role: string; is_active: number }
    | undefined;
  if (!target) {
    throw new AppError('用户不存在', 'NOT_FOUND');
  }

  if (target.role === 'root' && !active) {
    throw new AppError('超级管理员账号不可被禁用', 'ROOT_PROTECTED');
  }

  if (isAdminOperator && isAdminRole(target.role)) {
    throw new AppError('普通管理员不可操作其他管理员账号', 'FORBIDDEN');
  }

  if (adminId === targetUserId && !active && target.is_active === 1) {
    throw new AppError('不能禁用自己的账号', 'SELF_DISABLE');
  }

  if (
    !active &&
    target.is_active === 1 &&
    isAdminRole(target.role) &&
    countActiveAdmins() <= 1
  ) {
    throw new AppError('不能禁用最后一个管理员，请先提升其他用户为管理员', 'LAST_ADMIN');
  }

  const newActive = active ? 1 : 0;
  if (target.is_active === newActive) {
    throw new AppError('状态无变化', 'NO_CHANGE');
  }

  db.prepare("UPDATE users SET is_active = ?, updated_at = datetime('now') WHERE id = ?").run(
    newActive,
    targetUserId,
  );

  logAdminAction(adminId, active ? 'enable_user' : 'disable_user', targetUserId, {
    from: target.is_active === 1,
    to: active,
  }, auditCtx?.ip, auditCtx?.userAgent);

  if (!active && target.is_active === 1) {
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(targetUserId);
  }

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(targetUserId) as UserRow;
  return toSafeUser(updated);
}

/** 管理员删除用户（硬删除）— 仅 root；root 不可删、不可删自己、不可删最后一个 admin；审计保留（admin_id 置 NULL 防销毁证据）；抛 NOT_FOUND/SELF_DELETE/LAST_ADMIN/ROOT_PROTECTED */
export function deleteUserByAdmin(adminId: string, targetUserId: string, auditCtx?: AuditContext): void {
  if (adminId === targetUserId) {
    throw new AppError('不能删除自己的账号', 'SELF_DELETE');
  }

  const db = getDb();
  const target = db.prepare('SELECT id, email, role, is_active FROM users WHERE id = ?').get(targetUserId) as
    | { id: string; email: string; role: string; is_active: number }
    | undefined;
  if (!target) {
    throw new AppError('用户不存在', 'NOT_FOUND');
  }

  if (target.role === 'root') {
    throw new AppError('超级管理员账号不可被删除', 'ROOT_PROTECTED');
  }

  if (isAdminRole(target.role) && target.is_active === 1 && countActiveAdmins() <= 1) {
    throw new AppError('不能删除最后一个管理员，请先提升其他用户为管理员', 'LAST_ADMIN');
  }

  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(targetUserId);
  db.prepare('DELETE FROM activity_participations WHERE user_id = ?').run(targetUserId);

  db.prepare('DELETE FROM users WHERE id = ?').run(targetUserId);

  logAdminAction(adminId, 'delete_user', null, {
    deletedUserId: targetUserId,
    email: target.email,
    role: target.role,
  }, auditCtx?.ip, auditCtx?.userAgent);
}