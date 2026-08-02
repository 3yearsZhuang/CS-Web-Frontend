/**
 * @file 角色权限管理服务层 — 角色注册表与权限映射 CRUD + 权限查询
 *
 * root 永远拥有所有权限、user 永远无管理权限（均不查 DB）；root_only 权限仅 root 可用。
 */

import { AppError } from '@/shared/app-error';
import { getDbEngine } from '@/shared/db/drivers';
import { getAdminRepository } from '@/shared/db/repositories';
import { logAdminAction, type AuditContext } from './audit';
import {
  ALL_PERMISSIONS,
  BUILTIN_ROLE_KEYS,
  isBuiltinRole,
  isRootOnlyPermission,
  isValidPermissionKey,
} from '@/shared/security/permissions';

/* ============= 类型定义 ============= */

/** 角色记录（与 DB roles 表对应） */
export interface RoleRecord {
  key: string;
  displayName: string;
  description: string;
  isSystem: boolean;
  isProtected: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  /** 该角色当前被授予的权限点 key 列表（不含 root_only） */
  permissions: string[];
  /** 使用该角色的用户数（仅 listRoles 返回） */
  userCount?: number;
}

/** 创建角色输入 */
export interface CreateRoleInput {
  key: string;
  displayName: string;
  description?: string;
  permissions: string[];
}

/** 更新角色元数据输入 */
export interface UpdateRoleInput {
  displayName?: string;
  description?: string;
}

/** 更新角色权限输入 */
export interface UpdateRolePermissionsInput {
  /** 全量替换：传入的角色权限点列表将完全替换该角色现有权限 */
  permissions: string[];
}

/* ============= 权限查询 ============= */

/** 权限缓存（进程级）— root/user 不缓存，其余角色缓存 60 秒，变更时主动清除 */
interface PermissionCacheEntry {
  permissions: Set<string>;
  expiresAt: number;
}
const permissionCache = new Map<string, PermissionCacheEntry>();
const CACHE_TTL_MS = 60 * 1000;

/** 清除指定角色的权限缓存（权限变更时调用） */
export function invalidatePermissionCache(roleKey: string): void {
  permissionCache.delete(roleKey);
}

/** 清除所有权限缓存 */
export function invalidateAllPermissionCache(): void {
  permissionCache.clear();
}

/** 获取角色权限点集合 — root 返回全部、user 返回空、其他查 DB（60 秒缓存） */
async function getRolePermissions(roleKey: string): Promise<Set<string>> {
  // root 永远拥有所有权限
  if (roleKey === 'root') {
    return new Set(ALL_PERMISSIONS.map((p) => p.key));
  }
  // user 永远无管理权限
  if (roleKey === 'user') {
    return new Set();
  }

  // 检查缓存
  const cached = permissionCache.get(roleKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.permissions;
  }

  // 查询 DB
  const repo = getAdminRepository();
  const rows = await repo.listRolePermissions(roleKey);
  const permissions = new Set(rows.map((r) => r.permission));

  // 写入缓存
  permissionCache.set(roleKey, {
    permissions,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return permissions;
}

/** 判断角色是否拥有指定权限 — 统一入口，root 全放行、user 全拒绝、root_only 仅 root */
export async function hasPermission(role: string, permission: string): Promise<boolean> {
  // root 永远拥有所有权限
  if (role === 'root') return true;
  // root_only 权限仅 root 可用
  if (isRootOnlyPermission(permission)) return false;
  // user 永远无管理权限
  if (role === 'user') return false;
  // 未知权限点
  if (!isValidPermissionKey(permission)) return false;
  // 查询角色权限
  return (await getRolePermissions(role)).has(permission);
}

/**
 * 判断角色是否为管理员角色
 */
export async function isAdminRoleDynamic(role: string): Promise<boolean> {
  if (role === 'root' || role === 'admin') return true;
  if (role === 'user') return false;
  // 内置细粒度角色
  if (BUILTIN_ROLE_KEYS.has(role) && role !== 'user') return true;
  // 自定义角色：拥有任意管理权限即视为管理员
  const perms = await getRolePermissions(role);
  return perms.size > 0;
}

/* ============= 角色 CRUD ============= */

/** 列出所有角色（含权限点与用户数）— 按 sortOrder 升序，内置在前 */
export async function listRoles(): Promise<RoleRecord[]> {
  const repo = getAdminRepository();
  const roleRows = await repo.listRoles();

  // 批量查询每个角色的权限与用户数
  return Promise.all(
    roleRows.map(async (row) => {
      const permRows = await repo.listRolePermissions(row.key);
      const userCount = await repo.countRoleUsers(row.key);

      return {
        key: row.key,
        displayName: row.display_name,
        description: row.description ?? '',
        isSystem: row.is_system === 1,
        isProtected: row.is_protected === 1,
        sortOrder: row.sort_order,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        permissions: permRows.map((r) => r.permission),
        userCount,
      };
    }),
  );
}

/** 获取单个角色详情 — 不存在抛 NOT_FOUND */
export async function getRole(roleKey: string): Promise<RoleRecord> {
  const repo = getAdminRepository();
  const row = await repo.getRoleByKey(roleKey);
  if (!row) {
    throw new AppError('角色不存在', 'NOT_FOUND');
  }

  const permRows = await repo.listRolePermissions(roleKey);
  const userCount = await repo.countRoleUsers(roleKey);

  return {
    key: row.key,
    displayName: row.display_name,
    description: row.description ?? '',
    isSystem: row.is_system === 1,
    isProtected: row.is_protected === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    permissions: permRows.map((r) => r.permission),
    userCount,
  };
}

/**
 * 创建自定义角色
 */
export async function createRole(
  adminId: string,
  input: CreateRoleInput,
  auditCtx?: AuditContext,
): Promise<RoleRecord> {
  // 校验 key
  const key = input.key.trim().toLowerCase();
  if (!/^[a-z][a-z0-9_]{1,31}$/.test(key)) {
    throw new AppError('角色 key 必须以字母开头，仅含小写字母/数字/下划线，长度 2-32', 'VALIDATION_ERROR');
  }
  if (isBuiltinRole(key)) {
    throw new AppError('角色 key 与内置角色冲突', 'ROLE_EXISTS');
  }

  // 校验 displayName
  const displayName = input.displayName.trim();
  if (!displayName || displayName.length > 32) {
    throw new AppError('角色名称不能为空且不超过 32 字符', 'VALIDATION_ERROR');
  }

  // 校验 description
  const description = input.description?.trim() ?? '';
  if (description.length > 200) {
    throw new AppError('角色描述不超过 200 字符', 'VALIDATION_ERROR');
  }

  // 校验 permissions
  const permissions = Array.from(new Set(input.permissions));
  for (const perm of permissions) {
    if (!isValidPermissionKey(perm)) {
      throw new AppError(`权限点不合法: ${perm}`, 'VALIDATION_ERROR');
    }
    if (isRootOnlyPermission(perm)) {
      throw new AppError(`权限点仅 root 可用，不能授予其他角色: ${perm}`, 'VALIDATION_ERROR');
    }
  }

  const repo = getAdminRepository();
  const engine = await getDbEngine();

  // 检查 key 是否已存在
  const existing = await repo.getRoleByKey(key);
  if (existing) {
    throw new AppError('角色 key 已存在', 'ROLE_EXISTS');
  }

  // 计算 sortOrder：放到非内置角色的最后
  const maxSortOrder = await repo.getMaxCustomSortOrder();
  const sortOrder = maxSortOrder + 1;

  // 事务：插入角色 + 权限
  await engine.transaction(async (tx) => {
    await repo.insertRole(tx, key, displayName, description, 0, 0, sortOrder);
    for (const perm of permissions) {
      await repo.insertRolePermission(tx, `${key}:${perm}`, key, perm);
    }
  });

  // 清除缓存
  invalidatePermissionCache(key);

  // 审计
  await logAdminAction(adminId, 'role_create', null, {
    roleKey: key,
    displayName,
    permissions,
  }, auditCtx?.ip, auditCtx?.userAgent);

  return getRole(key);
}

/** 更新角色元数据（displayName/description）— 受保护角色不可改；抛 VALIDATION_ERROR / NOT_FOUND */
export async function updateRole(
  adminId: string,
  roleKey: string,
  input: UpdateRoleInput,
  auditCtx?: AuditContext,
): Promise<RoleRecord> {
  const repo = getAdminRepository();
  const existing = await getRole(roleKey); // 抛 NOT_FOUND

  if (existing.isProtected) {
    throw new AppError('受保护角色不可修改', 'FORBIDDEN');
  }

  const sets: Record<string, string | number | null> = {};
  const auditDetails: Record<string, unknown> = {};

  if (input.displayName !== undefined) {
    const displayName = input.displayName.trim();
    if (!displayName || displayName.length > 32) {
      throw new AppError('角色名称不能为空且不超过 32 字符', 'VALIDATION_ERROR');
    }
    if (displayName !== existing.displayName) {
      sets['display_name'] = displayName;
      auditDetails.displayName = { from: existing.displayName, to: displayName };
    }
  }

  if (input.description !== undefined) {
    const description = input.description.trim();
    if (description.length > 200) {
      throw new AppError('角色描述不超过 200 字符', 'VALIDATION_ERROR');
    }
    if (description !== existing.description) {
      sets['description'] = description;
      auditDetails.description = { from: existing.description, to: description };
    }
  }

  if (Object.keys(sets).length === 0) {
    return existing;
  }

  await repo.updateRole(roleKey, sets);

  invalidatePermissionCache(roleKey);

  await logAdminAction(adminId, 'role_update', null, {
    roleKey,
    ...auditDetails,
  }, auditCtx?.ip, auditCtx?.userAgent);

  return getRole(roleKey);
}

/** 全量更新角色权限 — root_only 自动过滤并审计；受保护角色不可改；抛 VALIDATION_ERROR / NOT_FOUND */
export async function updateRolePermissions(
  adminId: string,
  roleKey: string,
  input: UpdateRolePermissionsInput,
  auditCtx?: AuditContext,
): Promise<RoleRecord> {
  const repo = getAdminRepository();
  const engine = await getDbEngine();
  const existing = await getRole(roleKey);

  if (existing.isProtected) {
    throw new AppError('受保护角色权限不可修改', 'FORBIDDEN');
  }

  // 校验权限点
  const permissions = Array.from(new Set(input.permissions));
  const skippedRootOnly: string[] = [];
  for (const perm of permissions) {
    if (!isValidPermissionKey(perm)) {
      throw new AppError(`权限点不合法: ${perm}`, 'VALIDATION_ERROR');
    }
    if (isRootOnlyPermission(perm)) {
      skippedRootOnly.push(perm);
    }
  }

  const finalPermissions = permissions.filter((p) => !isRootOnlyPermission(p));

  await engine.transaction(async (tx) => {
    // 清空现有权限
    await repo.deleteRolePermissions(roleKey);
    // 写入新权限
    for (const perm of finalPermissions) {
      await repo.insertRolePermission(tx, `${roleKey}:${perm}`, roleKey, perm);
    }
  });

  invalidatePermissionCache(roleKey);

  await logAdminAction(adminId, 'role_update_permissions', null, {
    roleKey,
    from: existing.permissions,
    to: finalPermissions,
    skippedRootOnly,
  }, auditCtx?.ip, auditCtx?.userAgent);

  return getRole(roleKey);
}

/**
 * 删除自定义角色
 */
export async function deleteRole(
  adminId: string,
  roleKey: string,
  auditCtx?: AuditContext,
): Promise<void> {
  const repo = getAdminRepository();
  const existing = await getRole(roleKey);

  if (existing.isSystem) {
    throw new AppError('内置角色不可删除', 'FORBIDDEN');
  }

  if ((existing.userCount ?? 0) > 0) {
    throw new AppError(`该角色仍被 ${existing.userCount} 个用户使用，无法删除`, 'ROLE_IN_USE');
  }

  await repo.deleteRole(roleKey);

  invalidatePermissionCache(roleKey);

  await logAdminAction(adminId, 'role_delete', null, {
    roleKey,
    displayName: existing.displayName,
  }, auditCtx?.ip, auditCtx?.userAgent);
}

/* ============= 权限点查询 ============= */

/** 获取所有权限点定义（扁平列表）— 供前端权限矩阵渲染 */
export function listPermissionModules() {
  return ALL_PERMISSIONS.map((p) => ({
    key: p.key,
    label: p.label,
    description: p.description,
    rootOnly: p.rootOnly === true,
  }));
}
