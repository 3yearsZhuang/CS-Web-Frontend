/**
 * @file 密码生命周期管理 — re-export 哈希原语 + 历史密码复用检测
 */

import crypto from 'node:crypto';
import { PASSWORD_HISTORY_LIMIT } from '@/shared/config';
import {
  hashPassword,
  verifyPassword,
  SCRYPT_KEYLEN,
  SCRYPT_SALT_LEN,
} from '@/shared/security/password';
import { getAuthRepository } from '@/shared/db/repositories/auth.repo';

// 向模块内 re-export，保持 './password' 引用便利
export { hashPassword, verifyPassword, SCRYPT_KEYLEN, SCRYPT_SALT_LEN };

/** 预生成 dummy hash — 用户不存在时执行等价 scryptSync 以均衡时序，防邮箱枚举 */
export const DUMMY_PASSWORD_HASH = (function () {
  const salt = crypto.randomBytes(SCRYPT_SALT_LEN);
  const hash = crypto.scryptSync('dummy-password-do-not-use', salt, SCRYPT_KEYLEN);
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
})();

/** 历史密码复用检测 — N 由 PASSWORD_HISTORY_LIMIT 控制，设为 0 则禁用 */
export async function isPasswordInHistory(userId: string, newPassword: string): Promise<boolean> {
  if (PASSWORD_HISTORY_LIMIT <= 0) return false;
  const repo = await getAuthRepository();
  const rows = await repo.listPasswordHistory(userId, PASSWORD_HISTORY_LIMIT);

  return rows.some((row) => verifyPassword(newPassword, row.password_hash));
}

/** 记录密码到历史表 — 变更成功后调用，超出上限的旧记录自动清理 */
export async function recordPasswordHistory(userId: string, passwordHash: string): Promise<void> {
  if (PASSWORD_HISTORY_LIMIT <= 0) return;
  const repo = await getAuthRepository();
  await repo.insertPasswordHistory(userId, passwordHash);

  // 清理超出保留上限 2 倍的旧记录，避免表无限膨胀
  const keepCount = PASSWORD_HISTORY_LIMIT * 2;
  await repo.prunePasswordHistory(userId, keepCount);
}
