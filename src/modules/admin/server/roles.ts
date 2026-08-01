/**
 * @file 角色权限管理服务层 — 角色注册表与权限映射 CRUD + 权限查询
 *
 * root 永远拥有所有权限、user 永远无管理权限（均不查 DB）；root_only 权限仅 root 可用。
 */

import { AppError } from '@/shared/app-error';
import { getDb } from '@/shared/db';
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
function getRolePermissions(roleKey: string): Set<string> {
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
  const db = getDb();
  const rows = db
    .prepare(
      'SELECT permission FROM role_permissions WHERE role_key = ? AND granted = 1',
    )
    .all(roleKey) as Array<{ permission: string }>;

  const permissions = new Set(rows.map((r) => r.permission));

  // 写入缓存
  permissionCache.set(roleKey, {
    permissions,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return permissions;
}

/** 判断角色是否拥有指定权限 — 统一入口，root 全放行、user 全拒绝、root_only 仅 root */
export function hasPermission(role: string, permission: string): boolean {
  // root 永远拥有所有权限
  if (role === 'root') return true;
  // root_only 权限仅 root 可用
  if (isRootOnlyPermission(permission)) return false;
  // user 永远无管理权限
  if (role === 'user') return false;
  // 未知权限点
  if (!isValidPermissionKey(permission)) return false;
  // 查询角色权限
  return getRolePermissions(role).has(permission);
}

/**
 * 判断角色是否为管理员角色
 *
 * 规则：
 *   - root / admin 永远是管理员
 *   - 内置细粒度角色（content_moderator/exam_admin/task_publisher）是管理员
 *   - 自定义角色：拥有任意一个管理权限即视为管理员
 *
 * 此函数替代旧版 identity.ts 中的 isAdminRole，支持动态角色。
 */
export function isAdminRoleDynamic(role: string): boolean {
  if (role === 'root' || role === 'admin') return true;
  if (role === 'user') return false;
  // 内置细粒度角色
  if (BUILTIN_ROLE_KEYS.has(role) && role !== 'user') return true;
  // 自定义角色：拥有任意管理权限即视为管理员
  const perms = getRolePermissions(role);
  return perms.size > 0;
}

/* ============= 角色 CRUD ============= */

/** 列出所有角色（含权限点与用户数）— 按 sortOrder 升序，内置在前 */
export function listRoles(): RoleRecord[] {
  const db = getDb();
  const roleRows = db
    .prepare(
      `SELECT key, display_name, description, is_system, is_protected, sort_order,
              created_at, updated_at
       FROM roles
       ORDER BY sort_order ASC, key ASC`,
    )
    .all() as Array<{
    key: string;
    display_name: string;
    description: string;
    is_system: number;
    is_protected: number;
    sort_order: number;
    created_at: string;
    updated_at: string;
  }>;

  // 批量查询每个角色的权限与用户数
  return roleRows.map((row) => {
    const permRows = db
      .prepare(
        'SELECT permission FROM role_permissions WHERE role_key = ? AND granted = 1',
      )
      .all(row.key) as Array<{ permission: string }>;

    const userCountRow = db
      .prepare('SELECT COUNT(*) as cnt FROM users WHERE role = ?')
      .get(row.key) as { cnt: number };

    return {
      key: row.key,
      displayName: row.display_name,
      description: row.description,
      isSystem: row.is_system === 1,
      isProtected: row.is_protected === 1,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      permissions: permRows.map((r) => r.permission),
      userCount: userCountRow.cnt,
    };
  });
}

/** 获取单个角色详情 — 不存在抛 NOT_FOUND */
export function getRole(roleKey: string): RoleRecord {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT key, display_name, description, is_system, is_protected, sort_order,
              created_at, updated_at
       FROM roles WHERE key = ?`,
    )
    .get(roleKey) as
    | {
        key: string;
        display_name: string;
        description: string;
        is_system: number;
        is_protected: number;
        sort_order: number;
        created_at: string;
        updated_at: string;
      }
    | undefined;

  if (!row) {
    throw new AppError('角色不存在', 'NOT_FOUND');
  }

  const permRows = db
    .prepare(
      'SELECT permission FROM role_permissions WHERE role_key = ? AND granted = 1',
    )
    .all(roleKey) as Array<{ permission: string }>;

  const userCountRow = db
    .prepare('SELECT COUNT(*) as cnt FROM users WHERE role = ?')
    .get(roleKey) as { cnt: number };

  return {
    key: row.key,
    displayName: row.display_name,
    description: row.description,
    isSystem: row.is_system === 1,
    isProtected: row.is_protected === 1,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    permissions: permRows.map((r) => r.permission),
    userCount: userCountRow.cnt,
  };
}

/**
 * 创建自定义角色
 *
 * 校验：
 *   - key 唯一，且不能与内置角色冲突
 *   - key 格式：^[a-z][a-z0-9_]*$，长度 2-32
 *   - displayName 非空，长度 1-32
 *   - permissions 必须为合法权限点 key，且不能包含 root_only 权限
 *
 * 冲突抛 Error('ROLE_EXISTS')，校验失败抛 Error('VALIDATION_ERROR')。
 */
export function createRole(
  adminId: string,
  input: CreateRoleInput,
  auditCtx?: AuditContext,
): RoleRecord {
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

  const db = getDb();

  // 检查 key 是否已存在
  const existing = db.prepare('SELECT key FROM roles WHERE key = ?').get(key);
  if (existing) {
    throw new AppError('角色 key 已存在', 'ROLE_EXISTS');
  }

  // 计算 sortOrder：放到非内置角色的最后
  const maxSortRow = db
    .prepare(
      `SELECT MAX(sort_order) as max_sort FROM roles WHERE is_system = 0`,
    )
    .get() as { max_sort: number | null };
  const sortOrder = (maxSortRow.max_sort ?? 50) + 1;

  // 事务：插入角色 + 权限
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO roles (key, display_name, description, is_system, is_protected, sort_order)
       VALUES (?, ?, ?, 0, 0, ?)`,
    ).run(key, displayName, description, sortOrder);

    const insertPerm = db.prepare(
      `INSERT OR IGNORE INTO role_permissions (id, role_key, permission, granted)
       VALUES (?, ?, ?, 1)`,
    );
    for (const perm of permissions) {
      insertPerm.run(`${key}:${perm}`, key, perm);
    }
  });
  tx();

  // 清除缓存
  invalidatePermissionCache(key);

  // 审计
  logAdminAction(adminId, 'role_create', null, {
    roleKey: key,
    displayName,
    permissions,
  }, auditCtx?.ip, auditCtx?.userAgent);

  return getRole(key);
}

/** 更新角色元数据（displayName/description）— 受保护角色不可改；抛 VALIDATION_ERROR / NOT_FOUND */
export function updateRole(
  adminId: string,
  roleKey: string,
  input: UpdateRoleInput,
  auditCtx?: AuditContext,
): RoleRecord {
  const db = getDb();
  const existing = getRole(roleKey); // 抛 NOT_FOUND

  if (existing.isProtected) {
    throw new AppError('受保护角色不可修改', 'FORBIDDEN');
  }

  const sets: string[] = [];
  const values: unknown[] = [];
  const auditDetails: Record<string, unknown> = {};

  if (input.displayName !== undefined) {
    const displayName = input.displayName.trim();
    if (!displayName || displayName.length > 32) {
      throw new AppError('角色名称不能为空且不超过 32 字符', 'VALIDATION_ERROR');
    }
    if (displayName !== existing.displayName) {
      sets.push('display_name = ?');
      values.push(displayName);
      auditDetails.displayName = { from: existing.displayName, to: displayName };
    }
  }

  if (input.description !== undefined) {
    const description = input.description.trim();
    if (description.length > 200) {
      throw new AppError('角色描述不超过 200 字符', 'VALIDATION_ERROR');
    }
    if (description !== existing.description) {
      sets.push('description = ?');
      values.push(description);
      auditDetails.description = { from: existing.description, to: description };
    }
  }

  if (sets.length === 0) {
    return existing;
  }

  sets.push("updated_at = datetime('now')");
  values.push(roleKey);

  const tx = db.transaction(() => {
    db.prepare(`UPDATE roles SET ${sets.join(', ')} WHERE key = ?`).run(...values);
  });
  tx();

  invalidatePermissionCache(roleKey);

  logAdminAction(adminId, 'role_update', null, {
    roleKey,
    ...auditDetails,
  }, auditCtx?.ip, auditCtx?.userAgent);

  return getRole(roleKey);
}

/** 全量更新角色权限 — root_only 自动过滤并审计；受保护角色不可改；抛 VALIDATION_ERROR / NOT_FOUND */
export function updateRolePermissions(
  adminId: string,
  roleKey: string,
  input: UpdateRolePermissionsInput,
  auditCtx?: AuditContext,
): RoleRecord {
  const db = getDb();
  const existing = getRole(roleKey);

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
      // root_only 权限不允许授予非 root 角色，自动跳过
      skippedRootOnly.push(perm);
    }
  }

  const finalPermissions = permissions.filter((p) => !isRootOnlyPermission(p));

  const tx = db.transaction(() => {
    // 清空现有权限
    db.prepare('DELETE FROM role_permissions WHERE role_key = ?').run(roleKey);
    // 写入新权限
    const insertPerm = db.prepare(
      `INSERT OR IGNORE INTO role_permissions (id, role_key, permission, granted)
       VALUES (?, ?, ?, 1)`,
    );
    for (const perm of finalPermissions) {
      insertPerm.run(`${roleKey}:${perm}`, roleKey, perm);
    }
  });
  tx();

  invalidatePermissionCache(roleKey);

  logAdminAction(adminId, 'role_update_permissions', null, {
    roleKey,
    from: existing.permissions,
    to: finalPermissions,
    skippedRootOnly,
  }, auditCtx?.ip, auditCtx?.userAgent);

  return getRole(roleKey);
}

/**
 * 删除自定义角色
 *
 * - 内置角色不可删除
 * - 若有用户仍使用该角色，拒绝删除（抛 ROLE_IN_USE）
 *
 * 校验失败抛 Error('VALIDATION_ERROR')，不存在抛 Error('NOT_FOUND')。
 */
export function deleteRole(
  adminId: string,
  roleKey: string,
  auditCtx?: AuditContext,
): void {
  const db = getDb();
  const existing = getRole(roleKey);

  if (existing.isSystem) {
    throw new AppError('内置角色不可删除', 'FORBIDDEN');
  }

  if ((existing.userCount ?? 0) > 0) {
    throw new AppError(`该角色仍被 ${existing.userCount} 个用户使用，无法删除`, 'ROLE_IN_USE');
  }

  const tx = db.transaction(() => {
    // role_permissions 通过 ON DELETE CASCADE 自动清理
    db.prepare('DELETE FROM roles WHERE key = ?').run(roleKey);
  });
  tx();

  invalidatePermissionCache(roleKey);

  logAdminAction(adminId, 'role_delete', null, {
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
