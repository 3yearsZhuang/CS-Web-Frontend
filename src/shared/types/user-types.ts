/**
 * @file 用户公开类型与转换函数
 *
 * 下沉到 shared/ 层消除 modules/auth ↔ modules/user 的循环依赖，并切断 admin/user → auth 的跨模块依赖。
 */

import type { UserRole } from '@/shared/types/role-types';

/** 用户信息（与后端 SafeUser 一致） */
export interface User {
  id: string;
  email: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  avatarType: string;
  githubUrl: string | null;
  websiteUrl: string | null;
  techTags: string[];
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/** 公开用户对象（已统一至 User 接口，此处仅保留别名以兼容现有引用） */
export type SafeUser = User;

/** 数据库 users 行结构 */
export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  avatar_type: string | null;
  github_url: string | null;
  website_url: string | null;
  tech_tags: string | null;
  role: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

/** 将数据库行转换为安全用户对象（剔除 password_hash） */
export function toSafeUser(row: UserRow): SafeUser {
  let techTags: string[] = [];
  if (typeof row.tech_tags === 'string' && row.tech_tags) {
    try {
      techTags = JSON.parse(row.tech_tags);
    } catch { /* 忽略解析错误，返回空数组 */ }
  }

  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name ?? null,
    bio: row.bio ?? null,
    avatarUrl: row.avatar_url ?? null,
    avatarType: row.avatar_type ?? 'initial',
    githubUrl: row.github_url ?? null,
    websiteUrl: row.website_url ?? null,
    techTags,
    role: (row.role === 'admin' || row.role === 'root' ? row.role : 'user') as UserRole,
    isActive: row.is_active !== 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
