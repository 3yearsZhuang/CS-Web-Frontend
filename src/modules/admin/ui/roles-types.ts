/**
 * @file 管理员角色权限 — 类型与展示工具函数（从 admin-roles-panel 拆出，GENERAL 2.4）
 */

export interface RoleRecord {
  /** 后端数字角色 ID（更新/删除/权限保存以它为路径参数） */
  id: number;
  key: string;
  displayName: string;
  /** 旧端（宗门）展示名；为空时仅显示 displayName */
  fantasyDisplayName?: string;
  description: string;
  isSystem: boolean;
  isProtected: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  permissions: string[];
  userCount?: number;
}

export interface PermissionPoint {
  key: string;
  label: string;
  description: string;
  rootOnly?: boolean;
}

export interface PermissionModule {
  key: string;
  label: string;
  permissions: PermissionPoint[];
}

export type RoleModal =
  | { type: 'none' }
  | { type: 'create' }
  | { type: 'edit'; role: RoleRecord }
  | { type: 'delete'; role: RoleRecord };

/** 是否为受保护角色（后端把全部系统内置角色标为 isProtected，这里只区分高危角色） */
function isHighRiskRole(role: RoleRecord): boolean {
  return role.key === 'root' || role.key === 'admin' || role.key === 'rbac_admin';
}

/** 角色徽标样式类 */
export function roleBadgeClass(role: RoleRecord): string {
  if (role.key === 'root') return 'bg-[var(--primary)]/15 text-[var(--primary)]';
  if (isHighRiskRole(role)) return 'bg-[var(--muted)]/30 text-[var(--muted-foreground)]';
  if (role.isSystem) return 'bg-[var(--accent)]/15 text-[var(--accent-foreground)]';
  return 'bg-transparent text-[var(--foreground)] border border-[var(--border)]';
}

/** 角色徽标文案 */
export function roleBadgeLabel(role: RoleRecord): string {
  if (role.key === 'root') return 'ROOT';
  if (isHighRiskRole(role)) return 'PROTECTED';
  if (role.isSystem) return 'SYSTEM';
  return 'CUSTOM';
}
