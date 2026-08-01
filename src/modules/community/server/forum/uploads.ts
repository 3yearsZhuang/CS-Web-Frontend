/**
 * @file 论坛服务层 — 图片上传（5MB 上限，MIME/扩展名/魔数校验）
 */
import crypto from 'node:crypto';
import { logger } from '@/shared/logger';
import path from 'node:path';
import fs from 'node:fs';
import { AppError } from '@/shared/app-error';
import { validateImageMagicBytes } from '@/shared/utils/image-utils';

/** 论坛图片上传限制 — 比 avatar 更宽松（5MB），允许截图与图表 */
export const FORUM_IMAGE_LIMITS = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_MIME: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const,
  ALLOWED_EXT: ['.jpg', '.jpeg', '.png', '.webp', '.gif'] as const,
} as const;

/**
 * 保存上传的论坛图片，返回可访问 URL。
 * 安全控制与 avatar 上传同构：大小/MIME/扩展名/魔数校验，
 * 文件名使用 userId+timestamp+随机后缀（不用原始文件名），存储路径限定在 data/forum-images/。
 */
export function saveForumImage(
  userId: string,
  fileBuffer: Buffer,
  mimeType: string,
  originalName: string,
): string {
  if (fileBuffer.length > FORUM_IMAGE_LIMITS.MAX_SIZE) {
    throw new AppError(`文件大小不能超过 ${FORUM_IMAGE_LIMITS.MAX_SIZE / 1024 / 1024}MB`, 'FILE_TOO_LARGE');
  }

  if (
    !FORUM_IMAGE_LIMITS.ALLOWED_MIME.includes(
      mimeType as (typeof FORUM_IMAGE_LIMITS.ALLOWED_MIME)[number],
    )
  ) {
    throw new AppError('仅支持 JPEG / PNG / WebP / GIF 格式', 'INVALID_TYPE');
  }

  const ext = path.extname(originalName).toLowerCase();
  if (
    !FORUM_IMAGE_LIMITS.ALLOWED_EXT.includes(
      ext as (typeof FORUM_IMAGE_LIMITS.ALLOWED_EXT)[number],
    )
  ) {
    throw new AppError('文件扩展名不被允许', 'INVALID_TYPE');
  }

  // 魔数校验防止伪造 MIME 类型
  if (!validateImageMagicBytes(fileBuffer)) {
    throw new AppError('文件内容与声明类型不匹配', 'INVALID_TYPE');
  }

  const imagesDir = path.join(process.cwd(), 'data', 'forum-images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  const filename = `${userId}-${timestamp}-${randomSuffix}${ext}`;
  const filePath = path.join(imagesDir, filename);

  try {
    fs.writeFileSync(filePath, fileBuffer);
  } catch (e) {
    logger.error({ err: e }, '图片保存失败');
    throw new AppError('图片保存失败', 'SAVE_FAILED');
  }

  return `/api/forum/images/${filename}`;
}

/** 读取上传的论坛图片 — 严格文件名校验 + 防路径遍历，文件不存在或非法时返回 null */
export function readForumImage(filename: string): {
  data: Buffer;
  mimeType: string;
} | null {
  if (!/^[a-f0-9-]{36}-\d+-[a-f0-9]{8}\.(jpg|jpeg|png|webp|gif)$/i.test(filename)) {
    return null;
  }

  // 双重防御：正则已限制字符集，仍拒绝路径分隔符与 ..
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return null;
  }

  const filePath = path.join(process.cwd(), 'data', 'forum-images', filename);
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
