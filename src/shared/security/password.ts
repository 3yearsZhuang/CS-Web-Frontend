/**
 * @file 密码哈希原语 — scrypt + 随机 salt（server-only，纯 crypto 原语不依赖 DB）
 */

import 'server-only';
import crypto from 'node:crypto';

/** scrypt 输出 key 长度（字节） */
export const SCRYPT_KEYLEN = 64;

/** scrypt salt 长度（字节） */
export const SCRYPT_SALT_LEN = 16;

/** 密码哈希 — scryptSync + 随机 salt，返回 `saltHex:hashHex` 格式字符串 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(SCRYPT_SALT_LEN);
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

/**
 * 验证密码是否匹配哈希
 */
export function verifyPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  try {
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
    return crypto.timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
