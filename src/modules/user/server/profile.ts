/**
 * @file 个人资料服务 — 读取/更新/头像/活动记录（userId 始终从 session 获取，不接受客户端传入）（ADR-009 async）
 */

import path from 'node:path';
import fs from 'node:fs';
import { logger } from '@/shared/logger';
import { toSafeUser, type SafeUser, type UserRow } from '@/shared/types';
import { AppError } from '@/shared/app-error';
import { isValidPresetId, getPresetById } from '@/shared/config';
import { validateProfileFields, type ProfileFields } from '../types';
import { validateTechTags } from '@/shared/utils/tech-tags';
import { validateImageMagicBytes } from '@/shared/utils/image-utils';
import {
  verifyPassword,
  hashPassword,
  isPasswordInHistory,
  recordPasswordHistory,
} from '@/modules/auth/server';
import { getAuthRepository } from '@/shared/db/repositories/auth.repo';
import { getUserRepository } from '@/shared/db/repositories/user.repo';

/**
 * 个人资料可编辑字段
 *
 * 与 `ProfileFields` 同构，作为公共类型别名供 API 路由使用。
 */
export type ProfileUpdate = ProfileFields & {
  /** 技术方向标签（可选，key 数组） */
  techTags?: string[];
};

/** 头像上传限制 */
export const AVATAR_LIMITS = {
  MAX_SIZE: 2 * 1024 * 1024,
  ALLOWED_MIME: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const,
  ALLOWED_EXT: ['.jpg', '.jpeg', '.png', '.webp', '.gif'] as const,
} as const;

/** 活动参与记录 */
export interface ActivityParticipation {
  id: string;
  activityTitle: string;
  activityDate: string;
  role: string | null;
  createdAt: string;
}

/**
 * 获取用户完整资料（含活动记录）
 */
export async function getProfile(userId: string): Promise<{
  user: SafeUser;
  activities: ActivityParticipation[];
} | null> {
  const repo = await getUserRepository();
  const row = await repo.findById(userId);
  if (!row) return null;

  const activities = await repo.listActivityParticipations(userId);

  return {
    user: toSafeUser(row),
    activities: activities.map((a) => ({
      id: a.id,
      activityTitle: a.activity_title,
      activityDate: a.activity_date,
      role: a.role,
      createdAt: a.created_at,
    })),
  };
}

/** 更新用户资料 — 输入校验失败抛 Error('VALIDATION_ERROR') */
export async function updateProfile(userId: string, update: ProfileUpdate): Promise<SafeUser> {
  const validation = validateProfileFields(update);
  if (!validation.ok) {
    throw new AppError(validation.error || '输入校验失败', 'VALIDATION_ERROR');
  }

  const repo = await getUserRepository();
  const sets: string[] = [];
  const values: unknown[] = [];

  if (validation.clean.displayName !== undefined) {
    sets.push('display_name = ?');
    values.push(validation.clean.displayName);
  }
  if (validation.clean.bio !== undefined) {
    sets.push('bio = ?');
    values.push(validation.clean.bio);
  }
  if (validation.clean.githubUrl !== undefined) {
    sets.push('github_url = ?');
    values.push(validation.clean.githubUrl);
  }
  if (validation.clean.websiteUrl !== undefined) {
    sets.push('website_url = ?');
    values.push(validation.clean.websiteUrl);
  }
  if (update.techTags !== undefined) {
    const tagsValidation = validateTechTags(update.techTags);
    if (!tagsValidation.ok) {
      throw new AppError(tagsValidation.error, 'VALIDATION_ERROR');
    }
    sets.push('tech_tags = ?');
    values.push(JSON.stringify(tagsValidation.tags));
  }

  if (sets.length === 0) {
    const row = await repo.findById(userId);
    return toSafeUser(row as UserRow);
  }

  const row = await repo.updateProfileFields(userId, sets, values);
  return toSafeUser(row as UserRow);
}

/** 设置预设头像 — 预设 ID 无效时抛 Error('INVALID_PRESET') */
export async function setPresetAvatar(userId: string, presetId: number): Promise<SafeUser> {
  if (!isValidPresetId(presetId)) {
    throw new AppError('无效的预设头像 ID', 'INVALID_PRESET');
  }

  const preset = getPresetById(presetId)!;
  const repo = await getUserRepository();
  const row = await repo.setPresetAvatar(userId, preset.url);
  return toSafeUser(row as UserRow);
}

/**
 * 保存上传的头像文件
 *
 * 安全控制：
 *   - 文件大小校验（≤ 2MB）
 *   - MIME 类型白名单
 *   - 文件扩展名白名单
 *   - 文件名使用 userId + timestamp，不使用原始文件名
 *   - 存储路径限定在 data/avatars/ 下
 *
 * 抛 Error('FILE_TOO_LARGE' | 'INVALID_TYPE' | 'SAVE_FAILED')。
 */
export async function saveUploadedAvatar(
  userId: string,
  fileBuffer: Buffer,
  mimeType: string,
  originalName: string,
): Promise<SafeUser> {
  if (fileBuffer.length > AVATAR_LIMITS.MAX_SIZE) {
    throw new AppError(`文件大小不能超过 ${AVATAR_LIMITS.MAX_SIZE / 1024 / 1024}MB`, 'FILE_TOO_LARGE');
  }

  if (!AVATAR_LIMITS.ALLOWED_MIME.includes(mimeType as (typeof AVATAR_LIMITS.ALLOWED_MIME)[number])) {
    throw new AppError('仅支持 JPEG / PNG / WebP / GIF 格式', 'INVALID_TYPE');
  }

  const ext = path.extname(originalName).toLowerCase();
  if (!AVATAR_LIMITS.ALLOWED_EXT.includes(ext as (typeof AVATAR_LIMITS.ALLOWED_EXT)[number])) {
    throw new AppError('文件扩展名不被允许', 'INVALID_TYPE');
  }

  if (!validateImageMagicBytes(fileBuffer)) {
    throw new AppError('文件内容与声明类型不匹配', 'INVALID_TYPE');
  }

  const avatarsDir = path.join(process.cwd(), 'data', 'avatars');
  if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true });
  }

  const timestamp = Date.now();
  const filename = `${userId}-${timestamp}${ext}`;
  const filePath = path.join(avatarsDir, filename);

  try {
    fs.writeFileSync(filePath, fileBuffer);
  } catch (e) {
    logger.error({ err: e }, '头像保存失败');
    throw new AppError('头像保存失败', 'SAVE_FAILED');
  }

  const repo = await getUserRepository();
  const avatarUrl = `/api/avatars/${filename}`;

  const oldRow = await repo.findAvatarById(userId);
  if (oldRow?.avatar_type === 'uploaded' && oldRow.avatar_url) {
    const oldFilename = path.basename(oldRow.avatar_url);
    const oldPath = path.join(avatarsDir, oldFilename);
    if (fs.existsSync(oldPath)) {
      try {
        fs.unlinkSync(oldPath);
      } catch {
        // 旧文件删除失败不阻塞流程
      }
    }
  }

  const row = await repo.setUploadedAvatar(userId, avatarUrl);
  return toSafeUser(row as UserRow);
}

/** 读取上传的头像 — filename 正则校验防止路径遍历 */
export function readUploadedAvatar(filename: string): {
  data: Buffer;
  mimeType: string;
} | null {
  if (!/^[a-f0-9-]{36}-\d+\.(jpg|jpeg|png|webp|gif)$/i.test(filename)) {
    return null;
  }

  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return null;
  }

  const filePath = path.join(process.cwd(), 'data', 'avatars', filename);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const ext = path.extname(filename).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };

  try {
    const data = fs.readFileSync(filePath);
    return { data, mimeType: mimeMap[ext] || 'application/octet-stream' };
  } catch {
    return null;
  }
}

/** 修改密码结果 */
export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; reason: 'INVALID_CURRENT_PASSWORD' | 'PASSWORD_IN_HISTORY' };

/**
 * 修改用户密码 — 验证旧密码 → 历史密码复用检测 → 更新哈希 → 清除其他 session（保留 keepSessionId）
 * 安全：userId 始终从 session 获取；旧密码校验失败返回 INVALID_CURRENT_PASSWORD，不泄露具体原因
 */
export async function changeUserPassword(
  userId: string,
  oldPassword: string,
  newPassword: string,
  options?: { keepSessionId?: string },
): Promise<ChangePasswordResult> {
  const userRepo = await getUserRepository();
  const authRepo = await getAuthRepository();

  // 验证旧密码（用户来自 session，必定存在）
  const row = await userRepo.findPasswordHashById(userId);
  if (!row?.password_hash || !verifyPassword(oldPassword, row.password_hash)) {
    return { ok: false, reason: 'INVALID_CURRENT_PASSWORD' };
  }

  // 历史密码复用检测：新密码不能与最近 N 次历史密码相同
  if (await isPasswordInHistory(userId, newPassword)) {
    return { ok: false, reason: 'PASSWORD_IN_HISTORY' };
  }

  // 记录旧密码到历史表（在更新前获取当前哈希）
  await recordPasswordHistory(userId, row.password_hash);

  const passwordHash = hashPassword(newPassword);
  await userRepo.updatePasswordHash(userId, passwordHash);

  // 修改后删除所有其他 session（保留当前 session）
  if (options?.keepSessionId) {
    await authRepo.deleteSessionsByUser(userId, options.keepSessionId);
  } else {
    await authRepo.deleteSessionsByUser(userId);
  }

  return { ok: true };
}

/** 公开用户资料（含论坛/考试统计） */
export interface PublicUserProfile {
  user: {
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
    createdAt: string;
  };
  stats: {
    topicCount: number;
    replyCount: number;
    examCount: number;
    examPassedCount: number;
  };
}

/** 获取用户公开资料（无需登录）— 含论坛/考试统计，email 由调用方按需脱敏 */
export async function getPublicUserProfile(userId: string): Promise<PublicUserProfile | null> {
  const repo = await getUserRepository();
  const row = await repo.findByIdForPublic(userId);
  if (!row) return null;

  let techTags: string[] = [];
  if (row.tech_tags) {
    try {
      techTags = JSON.parse(row.tech_tags);
    } catch {
      /* ignore */
    }
  }

  const stats = await repo.getPublicStats(userId);

  return {
    user: {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      bio: row.bio,
      avatarUrl: row.avatar_url,
      avatarType: row.avatar_type ?? 'initial',
      githubUrl: row.github_url,
      websiteUrl: row.website_url,
      techTags,
      role: row.role,
      createdAt: row.created_at,
    },
    stats: {
      topicCount: stats.topicCount,
      replyCount: stats.replyCount,
      examCount: stats.examCount,
      examPassedCount: stats.examPassedCount,
    },
  };
}
