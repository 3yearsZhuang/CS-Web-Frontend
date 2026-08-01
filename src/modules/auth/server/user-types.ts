/**
 * @file 用户类型与角色判定 — re-export @/shared/types 保持模块内引用便利
 *
 * 不可引入 auth 模块其他 server-only 文件，避免循环依赖。
 */

export {
  type SafeUser,
  type UserRow,
  toSafeUser,
  isAdminRole,
} from '@/shared/types';
