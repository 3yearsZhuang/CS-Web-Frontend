/**
 * @file 用户模块 — 共享类型
 *
 * UserRole 已统一至 @/shared/types/role-types，此处 re-export 保持向后兼容。
 */

import type { UserRole } from '@/shared/types/role-types';
export type { UserRole };

/** User 接口已统一至 @/shared/types/user-types，此处 re-export 保持向后兼容 */
export type { User } from '@/shared/types/user-types';

/** 活动参与记录 */
export interface ActivityParticipation {
  id: string;
  activityTitle: string;
  activityDate: string;
  role: string | null;
  createdAt: string;
}

/** 用户资料可编辑字段（与 AdminUserUpdate / ProfileUpdate 共有的子集） */
export interface ProfileFields {
  displayName?: string | null;
  bio?: string | null;
  githubUrl?: string | null;
  websiteUrl?: string | null;
}

/** 字段长度限制 */
export const USER_LIMITS = {
  DISPLAY_NAME_MAX: 32,
  BIO_MAX: 200,
  URL_MAX: 500,
} as const;

/**
 * URL 格式校验（仅 http / https）
 *
 * 调用方需自行处理空值（`url && isValidHttpUrl(url)`）。
 * 返回 true 表示协议合法。
 */
export function isValidHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 校验并清理用户资料字段
 *
 * - trim 每个字符串字段
 * - 空字符串归一为 null（DB 列允许 NULL，避免存空串）
 * - 超长 / URL 非法时返回 `{ ok: false, error }`，`clean` 仅含已通过的字段
 * - 仅校验 `update` 中显式传入的字段（undefined 字段跳过，对应"不修改"语义）
 *
 * 返回值：
 *   - `{ ok: true, clean }`    全部字段通过
 *   - `{ ok: false, error }`   任一字段校验失败，error 为中文提示
 */
export function validateProfileFields(update: ProfileFields): {
  ok: boolean;
  error?: string;
  clean: ProfileFields;
} {
  const clean: ProfileFields = {};

  if (update.displayName !== undefined) {
    const name = update.displayName?.trim() ?? '';
    if (name.length > USER_LIMITS.DISPLAY_NAME_MAX) {
      return {
        ok: false,
        error: `显示名不能超过 ${USER_LIMITS.DISPLAY_NAME_MAX} 个字符`,
        clean,
      };
    }
    clean.displayName = name || null;
  }

  if (update.bio !== undefined) {
    const bio = update.bio?.trim() ?? '';
    if (bio.length > USER_LIMITS.BIO_MAX) {
      return {
        ok: false,
        error: `个人简介不能超过 ${USER_LIMITS.BIO_MAX} 个字符`,
        clean,
      };
    }
    clean.bio = bio || null;
  }

  if (update.githubUrl !== undefined) {
    const url = update.githubUrl?.trim() ?? '';
    if (url && !isValidHttpUrl(url)) {
      return { ok: false, error: 'GitHub 链接格式不正确', clean };
    }
    if (url.length > USER_LIMITS.URL_MAX) {
      return { ok: false, error: '链接过长', clean };
    }
    clean.githubUrl = url || null;
  }

  if (update.websiteUrl !== undefined) {
    const url = update.websiteUrl?.trim() ?? '';
    if (url && !isValidHttpUrl(url)) {
      return { ok: false, error: '个人网站链接格式不正确', clean };
    }
    if (url.length > USER_LIMITS.URL_MAX) {
      return { ok: false, error: '链接过长', clean };
    }
    clean.websiteUrl = url || null;
  }

  return { ok: true, clean };
}
