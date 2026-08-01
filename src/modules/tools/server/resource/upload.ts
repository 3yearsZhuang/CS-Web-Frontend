/**
 * @file 资源文件上传与存储服务
 */

import crypto from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';

const RESOURCE_FILES_DIR = path.join(process.cwd(), 'data', 'resource-files');

const RESOURCE_ALLOWED_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
};

/** 保存上传的资源文件 */
export function saveResourceFile(
  userId: string,
  fileBuffer: Buffer,
  ext: string,
): string {
  if (!fs.existsSync(RESOURCE_FILES_DIR)) {
    fs.mkdirSync(RESOURCE_FILES_DIR, { recursive: true });
  }

  const timestamp = Date.now();
  const randomSuffix = crypto.randomBytes(4).toString('hex');
  const filename = `${userId}-${timestamp}-${randomSuffix}${ext}`;
  const filePath = path.join(RESOURCE_FILES_DIR, filename);

  fs.writeFileSync(filePath, fileBuffer);

  return `/api/tools/resource/upload?filename=${filename}`;
}

/** 读取上传的资源文件 */
export function readResourceFile(filename: string): {
  data: Buffer;
  mimeType: string;
} | null {
  if (!/^[a-f0-9-]{36}-\d+-[a-f0-9]{8}\.(jpg|jpeg|png|webp|gif|pdf|zip)$/i.test(filename)) {
    return null;
  }

  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return null;
  }

  const filePath = path.join(RESOURCE_FILES_DIR, filename);
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const ext = path.extname(filename).toLowerCase();

  try {
    const data = fs.readFileSync(filePath);
    return { data, mimeType: RESOURCE_ALLOWED_EXT[ext] || 'application/octet-stream' };
  } catch {
    return null;
  }
}
