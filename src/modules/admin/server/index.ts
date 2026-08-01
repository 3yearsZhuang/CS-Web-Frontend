/**
 * @file 管理员服务层 — barrel
 */

import 'server-only';

// require.ts — 身份校验守卫
export {
  requireAdmin,
  requireRoot,
  requireModuleAdmin,
  requirePasswordConfirmation,
} from './require';

// users.ts — 用户管理
export {
  listUsers,
  getUserById,
  updateUserByAdmin,
  setUserActiveByAdmin,
  deleteUserByAdmin,
  type AdminUserUpdate,
  type ListUsersParams,
  type UserListResult,
} from './users';

// password-reset.ts — 重置用户密码
export {
  resetUserPasswordDefault,
  resetUserPasswordCustom,
} from './password-reset';

// audit.ts — 审计日志
export {
  logAdminAction,
  listAdminActions,
  deleteAdminAction,
  deleteAdminActionsBefore,
  type AdminAction,
  type AuditContext,
} from './audit';

// roles.ts — 角色权限管理
export * from './roles';