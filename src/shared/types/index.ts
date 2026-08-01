/**
 * @file shared/types 统一导出
 *
 * 集中导出全局共享类型，消除各模块重复定义导致的值域分裂，并承载自 modules/auth 下沉的跨模块共享类型/函数（切断 admin/user → auth 的跨模块依赖）。
 */

export type { UserRole, AdminRole } from './role-types';
export { isAdminRole } from './role-types';
export type { User, SafeUser, UserRow } from './user-types';
export { toSafeUser } from './user-types';
export type { AuditContext } from './audit-types';
