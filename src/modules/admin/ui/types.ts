/**
 * @file 管理员面板共享类型与常量（跨面板领域类型 + PAGE_SIZE/LIMITS，面板专属类型保留在各面板内）
 */

import { USER_LIMITS } from '@/modules/user/types';
import { PASSWORD_MIN_LENGTH } from '@/modules/auth/types/constants';
import type { EventItem, RegistrationField } from '@/modules/events/types';

export type { EventItem };
export type RegistrationFieldDef = RegistrationField;

/* ============= 角色与用户 ============= */

// UserRole / SafeUser 已统一至全局共享定义，此处 re-export 保持向后兼容
import type { UserRole, SafeUser } from '@/shared/types';
export type { UserRole, SafeUser };

export interface UserListResult {
  users: SafeUser[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/* ============= 密码重置申请 ============= */

/** 密码重置申请记录 */
export interface PasswordResetRequest {
  id: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_id: string | null;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
}

/* ============= 审计日志 ============= */

/** 审计日志项（与后端 AdminAction 一致） */
export interface AdminAction {
  id: string;
  adminId: string | null;
  adminEmail: string | null;
  adminDisplayName: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  targetUserId: string | null;
  targetEmail: string | null;
  targetDisplayName: string | null;
  details: string | null;
  createdAt: string;
}

/* ============= 活动 ============= */

/** 活动编辑表单 */
export interface EventForm {
  month: string;
  date: string;
  title: string;
  description: string;
  status: 'upcoming' | 'ongoing' | 'ended' | '';
  year: string;
  topicsStr: string;
  tagsStr: string;
  isPinned: boolean;
  capacity: number;
  contentMarkdown: string;
  registrationFields?: RegistrationFieldDef[];
}

/** 报名记录 */
export interface RegistrationRecord {
  id: string;
  userId: string;
  eventId: string;
  status: 'registered' | 'cancelled' | 'waitlisted';
  formData: Record<string, string> | null;
  registeredAt: string;
  cancelledAt: string | null;
  /** 报名者邮箱（JOIN 查询） */
  email?: string;
  /** 报名者显示名（JOIN 查询） */
  displayName?: string;
}

/** 年份分组 */
export interface YearGroup {
  year: string;
  events: EventItem[];
}

/* ============= 通知 ============= */

export type NotifType = 'system' | 'admin' | 'activity';

export interface NotifHistoryItem {
  title: string;
  content: string | null;
  type: NotifType;
  createdAt: string;
  recipientCount: number;
}

/* ============= 常量 ============= */

/** 表单字段长度限制（前后端共享 USER_LIMITS；密码长度沿用 auth-constants） */
export const LIMITS = {
  ...USER_LIMITS,
  PASSWORD_MIN: PASSWORD_MIN_LENGTH,
} as const;

/** 用户列表分页大小 */
export const PAGE_SIZE = 50;

/* ============= Tab 类型 ============= */

export type AdminTab =
  | 'roles'
  | 'users'
  | 'messages'
  | 'join'
  | 'logs'
  | 'feature-visibility';
