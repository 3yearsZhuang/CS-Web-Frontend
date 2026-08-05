/**
 * @file 管理员用户管理 — 类型与展示工具函数（从 admin-users-panel 拆出，GENERAL 2.4）
 */

import type { PasswordResetRequest, SafeUser, UserRole } from '@/modules/admin/ui/types';

export type RoleFilter = 'all' | UserRole;
export type ActiveFilter = 'all' | 'active' | 'inactive';
export type UserSubView = 'list' | 'resets';
export type ResetStatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

export interface EditForm {
  displayName: string;
  bio: string;
  githubUrl: string;
  websiteUrl: string;
  role: UserRole;
  isActive: boolean;
}

export type UserModal =
  | { type: 'none' }
  | { type: 'edit'; user: SafeUser }
  | { type: 'reset'; user: SafeUser }
  | { type: 'resetDefault'; user: SafeUser }
  | { type: 'delete'; user: SafeUser }
  | { type: 'disable'; user: SafeUser }
  | { type: 'approve'; request: PasswordResetRequest }
  | { type: 'reject'; request: PasswordResetRequest };

export function roleLabel(role: UserRole): string {
  return role === 'root' ? '超级管理员' : role === 'admin' ? '管理员' : '普通用户';
}

export function resetStatusLabel(status: PasswordResetRequest['status']): string {
  return status === 'pending' ? '待处理' : status === 'approved' ? '已批准' : '已拒绝';
}
