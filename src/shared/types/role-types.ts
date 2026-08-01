/**
 * @file 用户角色类型定义（单一来源）
 *
 * 各模块通过 re-export 引用，避免重复定义导致值域分裂。
 */

/** 用户角色（全量值域，与 DB users.role 列一致） */
export type UserRole =
  | 'user'
  | 'admin'
  | 'root'
  | 'content_moderator'
  | 'exam_admin'
  | 'task_publisher';

/** 所有管理员角色（不含普通用户） */
export type AdminRole =
  | 'admin'
  | 'root'
  | 'content_moderator'
  | 'exam_admin'
  | 'task_publisher';

/** 判断角色是否为管理员或管理员等价角色 */
export function isAdminRole(role: string): boolean {
  return role === 'admin' || role === 'root' || role === 'content_moderator' || role === 'exam_admin' || role === 'task_publisher';
}
