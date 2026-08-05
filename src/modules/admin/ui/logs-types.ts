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

/** 操作类型筛选项（空 v = 全部） */
export const ACTION_FILTERS: ActionFilterOption[] = [
  { v: '', label: '全部' },
  { v: 'update_user', label: '编辑用户' },
  { v: 'delete_user', label: '删除用户' },
  { v: 'disable_user', label: '禁用' },
  { v: 'enable_user', label: '启用' },
  { v: 'reset_password_default', label: '重置默认密码' },
  { v: 'reset_password_custom', label: '重置自定义密码' },
  { v: 'delete_log', label: '删除日志' },
  { v: 'broadcast_notification', label: '群发通知' },
];
