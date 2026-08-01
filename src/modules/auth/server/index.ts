/**
 * @file 认证服务层 — barrel，统一 re-export 各子模块公开 API
 */
import 'server-only';

// ============= 密码哈希与历史 =============
export {
  hashPassword,
  verifyPassword,
  isPasswordInHistory,
  recordPasswordHistory,
} from './password';

// ============= Session 与 2FA 预认证 token =============
export {
  createSession,
  getSession,
  deleteSession,
  deleteSessionById,
  listUserSessions,
  create2FAToken,
  verify2FAToken,
} from './session';

// ============= 登录历史 =============
export {
  recordLoginHistory,
  getLoginHistory,
  type LoginHistoryEntry,
} from './login-history';

// ============= 用户类型与角色判定（下沉至 @/shared/types）=============
export {
  type SafeUser,
  type UserRow,
  toSafeUser,
  isAdminRole,
} from './user-types';

// ============= 核心身份操作 =============
export { createUser, authenticateUser, isEmailRegistered } from './identity';

// ============= auth/types re-export =============
export {
  type UserRole,
  type SessionData,
  type AdminRole,
  type AdminModule,
  hasModulePermission,
} from '../types';

// ============= 忘记密码 =============
export {
  createResetRequest,
  listResetRequests,
  approveResetRequest,
  rejectResetRequest,
  type ResetRequestStatus,
  type PasswordResetRequest,
} from './password-reset';

// ============= 注册验证码 =============
export { generateCode, verifyCode } from './verification-code';

// ============= GitHub OAuth =============
export {
  generateOAuthState,
  getGitHubAuthUrl,
  verifyGitHubCallback,
  unlinkGitHub,
} from './oauth';

// ============= TOTP 双因素认证 =============
export * from './totp';
