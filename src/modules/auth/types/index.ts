/**
 * @file 认证模块 — 共享类型（UserRole/AdminRole/SafeUser 等均 re-export 自 @/shared/types 保持向后兼容）
 */

import type { UserRole, AdminRole } from '@/shared/types/role-types';
export type { UserRole, AdminRole };

// re-export @/shared/types 保持向后兼容，避免其他模块绕过 barrel 直接 import identity
import type { SafeUser, UserRow } from '@/shared/types';
export type { SafeUser, UserRow };
export { isAdminRole } from '@/shared/types';

/** Session 关联用户信息 */
export interface SessionData {
  session: {
    id: string;
    userId: string;
    expiresAt: string;
    ip: string | null;
    userAgent: string | null;
    createdAt: string;
  };
  user: SafeUser;
}

/** 登录历史记录 */
export interface LoginHistoryEntry {
  id: string;
  userId: string;
  ip: string | null;
  userAgent: string | null;
  success: boolean;
  createdAt: string;
}

/** 管理模块类型 — 与 PERMISSION_MODULES 的 key 对齐，细粒度角色仅能访问授权模块 */
export type AdminModule =
  | 'forum' | 'exam' | 'task' | 'event' | 'blog'
  | 'resource' | 'notification' | 'join' | 'user'
  | 'audit' | 'role' | 'password';

/** 细粒度角色 → 可访问模块映射（content_moderator 仅 forum，其余模块仅 admin/root 可访问） */
const ROLE_MODULE_MAP: Record<string, readonly AdminModule[]> = {
  content_moderator: ['forum'],
  exam_admin: ['exam'],
  task_publisher: ['task'],
};

/** 判断角色是否具有指定模块的管理权限 — admin/root 全放行，细粒度角色按 ROLE_MODULE_MAP 校验 */
export function hasModulePermission(role: string, module: AdminModule): boolean {
  if (role === 'admin' || role === 'root') return true;
  const allowed = ROLE_MODULE_MAP[role];
  return allowed?.includes(module) ?? false;
}
