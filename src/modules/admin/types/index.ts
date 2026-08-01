/**
 * @file 管理员模块 — 共享类型
 */

/** 用户角色 */
import type { UserRole } from '@/shared/types';

/** 管理员可编辑的用户字段 */
export interface AdminUserUpdate {
  displayName?: string | null;
  bio?: string | null;
  githubUrl?: string | null;
  websiteUrl?: string | null;
  role?: UserRole;
  isActive?: boolean;
  techTags?: string[];
}

/** 用户列表分页参数 — 支持搜索、角色筛选、启用状态筛选与分页 */
export interface ListUsersParams {
  /** 搜索关键词（匹配 email 或 display_name） */
  search?: string;
  /** 角色筛选 */
  role?: UserRole | 'all';
  /** 启用状态筛选 */
  active?: 'all' | 'active' | 'inactive';
  /** 每页数量（默认 50，上限 200） */
  pageSize?: number;
  /** 页码（从 1 开始） */
  page?: number;
}

/** 管理员操作审计记录 — 记录每次管理操作的详情、操作者与目标用户 */
export interface AdminAction {
  id: string;
  adminId: string | null;
  adminEmail: string | null;
  adminDisplayName: string | null;
  action: string;
  targetUserId: string | null;
  targetEmail: string | null;
  targetDisplayName: string | null;
  details: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

/** 审计上下文 — 从 shared/types re-export（同构安全，不依赖 server-only 模块） */
export type { AuditContext } from '@/shared/types';

/** 用户列表查询结果 — 包含分页信息与用户列表 */
export interface UserListResult {
  users: Array<{
    id: string;
    email: string;
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
    avatarType: string;
    githubUrl: string | null;
    websiteUrl: string | null;
    techTags: string[];
    role: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}