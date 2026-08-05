/**
 * @file 管理员审计日志 — 类型与常量定义（从 admin-logs-panel 拆出，遵循 2.4 关注点拆分）
 */

import type { AdminAction } from '@/modules/admin/ui/types';

/** 日志操作模态框状态机 */
export type LogModal =
  | { type: 'none' }
  | { type: 'logDelete'; action: AdminAction }
  | { type: 'logDeleteBatch' };

/** 操作筛选下拉选项 */
export interface ActionFilterOption {
  v: string;
  label: string;
}

/** 单次拉取上限 */
export const LOGS_LIMIT = 100;

/** 操作类型筛选项（空 v = 全部）— 与后端点分命名保持一致 */
export const ACTION_FILTERS: ActionFilterOption[] = [
  { v: '', label: '全部' },
  { v: 'user.update', label: '编辑用户' },
  { v: 'user.delete', label: '删除用户' },
  { v: 'user.enable', label: '启用用户' },
  { v: 'user.disable', label: '禁用用户' },
  { v: 'user.reset_password', label: '重置密码' },
  { v: 'user.grant_role', label: '授予角色' },
  { v: 'user.revoke_role', label: '收回角色' },
  { v: 'role.create', label: '创建角色' },
  { v: 'role.update', label: '更新角色' },
  { v: 'role.delete', label: '删除角色' },
  { v: 'event.create', label: '创建活动' },
  { v: 'event.update', label: '更新活动' },
  { v: 'event.delete', label: '删除活动' },
  { v: 'audit.delete', label: '删除日志' },
  { v: 'audit.delete_bulk', label: '批量清日志' },
  { v: 'broadcast_notification', label: '群发通知' },
];
