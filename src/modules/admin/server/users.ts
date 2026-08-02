/**
 * @file 用户管理 — 列表/更新/禁用/删除
 *
 * root 专属操作由 requireRoot 守卫；root 账号不可降级/禁用/删除；管理员不能操作自己；
 * 删除用户级联清理 sessions 等；列表不返回 password_hash。
 */
import { AppError } from '@/shared/app-error';
import { getAdminRepository } from '@/shared/db/repositories';
import type { QueryParams } from '@/shared/db/drivers';
import { toSafeUser, isAdminRole, type SafeUser, type UserRow } from '@/shared/types';
import { validateProfileFields, type ProfileFields } from '@/modules/user/types';
import { computePagination, computeTotalPages } from '@/shared/utils/pagination';
import { validateTechTags } from '@/shared/utils/tech-tags';
import { logAdminAction } from './audit';
import type { AuditContext } from '../types';
import type { AdminUserUpdate, ListUsersParams, UserListResult } from '../types';

export type { AdminUserUpdate, ListUsersParams, UserListResult };

/** 统计当前启用管理员数量 — 用于"最后管理员保护"，禁止降级/删除最后一个 active admin */
async function countActiveAdmins(): Promise<number> {
  const repo = getAdminRepository();
  return repo.countActiveAdmins();
}

/** 列出所有用户（分页 + 搜索 + 筛选）— 不返回 password_hash */
export async function listUsers(params: ListUsersParams = {}): Promise<UserListResult> {
  const repo = getAdminRepository();
  const {
    search,
    role = 'all',
    active = 'all',
    pageSize = 50,
    page = 1,
  } = params;

  const conditions: string[] = [];
  const args: QueryParams = [];

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

  const total = await repo.countUsers(where, args);

  const { page: safePage, pageSize: safePageSize, offset } = computePagination({
    page,
    pageSize,
    defaultPageSize: 50,
    maxPageSize: 200,
  });

  const rows = await repo.listUsers(where, [...args, safePageSize, offset] as QueryParams);

  const totalPages = computeTotalPages(total, safePageSize);

  return {
    users: rows.map((r) => toSafeUser(r as UserRow)),
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages,
  };
}

/** 获取单个用户（管理员查看） */
export async function getUserById(userId: string): Promise<SafeUser | null> {
  const repo = getAdminRepository();
  const row = await repo.getUserById(userId);
  return row ? toSafeUser(row) : null;
}

/** 管理员更新用户 — 仅 root；root 不可被改、不可降级/禁用自己、不可动最后一个 admin；角色变更仅 user↔admin（不可提升为 root）；抛 VALIDATION_ERROR/NOT_FOUND/SELF_DEMOTE/SELF_DISABLE/LAST_ADMIN/ROOT_PROTECTED */
export async function updateUserByAdmin(
  adminId: string,
  targetUserId: string,
  update: AdminUserUpdate,
  auditCtx?: AuditContext,
): Promise<SafeUser> {
  const repo = getAdminRepository();
  const target = await repo.getUserById(targetUserId);
  if (!target) {
    throw new AppError('用户不存在', 'NOT_FOUND');
  }

  if (target.role === 'root') {
    throw new AppError('超级管理员账号不可被修改', 'ROOT_PROTECTED');
  }

  const sets: Record<string, string | number | null> = {};
  const auditDetails: Record<string, unknown> = {};

  const fieldsValidation = validateProfileFields(update);
  if (!fieldsValidation.ok) {
    throw new AppError(fieldsValidation.error || '输入校验失败', 'VALIDATION_ERROR');
  }
  const clean = fieldsValidation.clean;
  if (clean.displayName !== undefined) {
    sets['display_name'] = clean.displayName;
    auditDetails.displayName = clean.displayName;
  }
  if (clean.bio !== undefined) {
    sets['bio'] = clean.bio;
    auditDetails.bio = clean.bio;
  }
  if (clean.githubUrl !== undefined) {
    sets['github_url'] = clean.githubUrl;
    auditDetails.githubUrl = clean.githubUrl;
  }
  if (clean.websiteUrl !== undefined) {
    sets['website_url'] = clean.websiteUrl;
    auditDetails.websiteUrl = clean.websiteUrl;
  }

  if (update.techTags !== undefined) {
    const tagsValidation = validateTechTags(update.techTags);
    if (!tagsValidation.ok) {
      throw new AppError(tagsValidation.error, 'VALIDATION_ERROR');
    }
    sets['tech_tags'] = JSON.stringify(tagsValidation.tags);
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
      (await countActiveAdmins()) <= 1
    ) {
      throw new AppError('不能降级最后一个管理员，请先提升其他用户为管理员', 'LAST_ADMIN');
    }
    if (target.role !== update.role) {
      sets['role'] = update.role;
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
      (await countActiveAdmins()) <= 1
    ) {
      throw new AppError('不能禁用最后一个管理员，请先提升其他用户为管理员', 'LAST_ADMIN');
    }
    if (target.is_active !== newActive) {
      sets['is_active'] = newActive;
      auditDetails.isActive = { from: target.is_active === 1, to: update.isActive };
    }
  }

  if (Object.keys(sets).length === 0) {
    return toSafeUser(target);
  }

  await repo.updateUser(targetUserId, sets);

  const updated = await repo.getUserById(targetUserId);

  await logAdminAction(adminId, 'update_user', targetUserId, auditDetails, auditCtx?.ip, auditCtx?.userAgent);

  if (update.isActive === false && target.is_active === 1) {
    await repo.deleteSessionsByUserId(targetUserId);
  }

  return toSafeUser(updated as UserRow);
}

/** 管理员禁用/启用用户 — admin/root 均可；普通管理员不可操作其他管理员；抛 NOT_FOUND/ROOT_PROTECTED/FORBIDDEN/SELF_DISABLE/LAST_ADMIN/NO_CHANGE */
export async function setUserActiveByAdmin(
  adminId: string,
  targetUserId: string,
  active: boolean,
  auditCtx?: AuditContext,
): Promise<SafeUser> {
  const repo = getAdminRepository();
  const admin = await repo.getUserRole(adminId);
  if (!admin) {
    throw new AppError('操作者不存在', 'NOT_FOUND');
  }
  const isAdminOperator = admin.role !== 'root';

  const target = await repo.getUserActiveState(targetUserId);
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
    (await countActiveAdmins()) <= 1
  ) {
    throw new AppError('不能禁用最后一个管理员，请先提升其他用户为管理员', 'LAST_ADMIN');
  }

  const newActive = active ? 1 : 0;
  if (target.is_active === newActive) {
    throw new AppError('状态无变化', 'NO_CHANGE');
  }

  await repo.setUserActive(targetUserId, newActive);

  await logAdminAction(adminId, active ? 'enable_user' : 'disable_user', targetUserId, {
    from: target.is_active === 1,
    to: active,
  }, auditCtx?.ip, auditCtx?.userAgent);

  if (!active && target.is_active === 1) {
    await repo.deleteSessionsByUserId(targetUserId);
  }

  const updated = await repo.getUserById(targetUserId);
  return toSafeUser(updated as UserRow);
}

/** 管理员删除用户（硬删除）— 仅 root；root 不可删、不可删自己、不可删最后一个 admin；审计保留（admin_id 置 NULL 防销毁证据）；抛 NOT_FOUND/SELF_DELETE/LAST_ADMIN/ROOT_PROTECTED */
export async function deleteUserByAdmin(adminId: string, targetUserId: string, auditCtx?: AuditContext): Promise<void> {
  if (adminId === targetUserId) {
    throw new AppError('不能删除自己的账号', 'SELF_DELETE');
  }

  const repo = getAdminRepository();
  const target = await repo.getUserActiveState(targetUserId);
  if (!target) {
    throw new AppError('用户不存在', 'NOT_FOUND');
  }

  if (target.role === 'root') {
    throw new AppError('超级管理员账号不可被删除', 'ROOT_PROTECTED');
  }

  if (isAdminRole(target.role) && target.is_active === 1 && (await countActiveAdmins()) <= 1) {
    throw new AppError('不能删除最后一个管理员，请先提升其他用户为管理员', 'LAST_ADMIN');
  }

  const fullTarget = await repo.getUserById(targetUserId);

  await repo.deleteSessionsByUserId(targetUserId);
  await repo.deleteParticipationsByUserId(targetUserId);
  await repo.deleteUser(targetUserId);

  await logAdminAction(adminId, 'delete_user', null, {
    deletedUserId: targetUserId,
    email: fullTarget?.email,
    role: target.role,
  }, auditCtx?.ip, auditCtx?.userAgent);
}