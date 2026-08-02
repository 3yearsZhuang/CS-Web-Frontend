/**
 * @file 身份认证核心 — 用户创建与凭据校验（re-export 各子模块 API 保持向后兼容）
 */
import crypto from 'node:crypto';
import { AppError } from '@/shared/app-error';
import { type SafeUser, type UserRow, toSafeUser } from '@/shared/types';
import { hashPassword, verifyPassword, DUMMY_PASSWORD_HASH } from './password';
import { getAuthRepository } from '@/shared/db/repositories/auth.repo';

// ============= 向后兼容 re-export（保持旧 import 路径可用） =============
export {
  hashPassword,
  verifyPassword,
  isPasswordInHistory,
  recordPasswordHistory,
  DUMMY_PASSWORD_HASH,
} from './password';
export {
  createSession,
  getSession,
  deleteSession,
  deleteSessionById,
  listUserSessions,
  create2FAToken,
  verify2FAToken,
} from './session';
export {
  recordLoginHistory,
  getLoginHistory,
  type LoginHistoryEntry,
} from './login-history';
export { type SafeUser, type UserRow, toSafeUser, isAdminRole } from './user-types';

/** 创建新用户 — 邮箱已存在时抛 Error('EMAIL_EXISTS') */
export async function createUser(email: string, password: string): Promise<SafeUser> {
  const repo = await getAuthRepository();

  const existing = await repo.findUserByEmail(email.toLowerCase());
  if (existing) {
    throw new AppError('EMAIL_EXISTS', 'EMAIL_EXISTS');
  }

  const id = crypto.randomUUID();
  const passwordHash = hashPassword(password);

  await repo.insertUser(id, email.toLowerCase(), passwordHash);

  const row = await repo.findUserById(id);
  return toSafeUser(row as UserRow);
}

/** 验证用户凭据 — 用户不存在时执行 dummy scrypt 均衡时序防邮箱枚举；禁用账号响应与密码错误一致 */
export async function authenticateUser(email: string, password: string): Promise<SafeUser | null> {
  const repo = await getAuthRepository();
  const row = await repo.findUserByEmail(email.toLowerCase());
  if (!row) {
    verifyPassword(password, DUMMY_PASSWORD_HASH);
    return null;
  }
  if (!verifyPassword(password, row.password_hash)) return null;
  if (row.is_active === 0) return null;
  return toSafeUser(row);
}

/** 判断邮箱是否已被注册 — 注册前置检查，邮箱统一转小写查询 */
export async function isEmailRegistered(email: string): Promise<boolean> {
  const repo = await getAuthRepository();
  const row = await repo.findUserByEmail(email.toLowerCase());
  return row !== null;
}

/** 按 ID 获取用户（脱敏）— 供社区/权限校验复用 */
export async function getUserById(id: string): Promise<SafeUser | null> {
  const repo = await getAuthRepository();
  const row = await repo.findUserById(id);
  return row ? toSafeUser(row) : null;
}
