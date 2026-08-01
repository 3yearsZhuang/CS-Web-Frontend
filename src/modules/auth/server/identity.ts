/**
 * @file 身份认证核心 — 用户创建与凭据校验（re-export 各子模块 API 保持向后兼容）
 */
import crypto from 'node:crypto';
import { AppError } from '@/shared/app-error';
import { getDb } from '@/shared/db';
import { type SafeUser, type UserRow, toSafeUser } from '@/shared/types';
import { hashPassword, verifyPassword, DUMMY_PASSWORD_HASH } from './password';

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
export function createUser(email: string, password: string): SafeUser {
  const db = getDb();

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    throw new AppError('EMAIL_EXISTS', 'EMAIL_EXISTS');
  }

  const id = crypto.randomUUID();
  const passwordHash = hashPassword(password);

  db.prepare(
    'INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)',
  ).run(id, email.toLowerCase(), passwordHash);

  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow;
  return toSafeUser(row);
}

/** 验证用户凭据 — 用户不存在时执行 dummy scrypt 均衡时序防邮箱枚举；禁用账号响应与密码错误一致 */
export function authenticateUser(email: string, password: string): SafeUser | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase()) as
    | UserRow
    | undefined;
  if (!row) {
    verifyPassword(password, DUMMY_PASSWORD_HASH);
    return null;
  }
  if (!verifyPassword(password, row.password_hash)) return null;
  if (row.is_active === 0) return null;
  return toSafeUser(row);
}

/** 判断邮箱是否已被注册 — 注册前置检查，邮箱统一转小写查询 */
export function isEmailRegistered(email: string): boolean {
  const db = getDb();
  const row = db
    .prepare('SELECT id FROM users WHERE email = ?')
    .get(email.toLowerCase());
  return row !== undefined;
}
