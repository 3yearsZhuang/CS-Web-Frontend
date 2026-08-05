/**
 * @file 管理员审计日志 — 展示工具函数（从 admin-logs-panel 拆出，遵循 2.4 关注点拆分）
 *
 * 审计 action 采用后端点分命名（user.update / role.create / event.* / audit.delete 等），
 * 与 SQLite→PG 迁移后的后端 AuditService 记录一致。
 */

import type { AdminAction } from '@/modules/admin/ui/types';

/** 解析 detail 为对象（失败返回 null） */
function parseDetail(log: AdminAction): Record<string, unknown> | null {
  if (!log.details) return null;
  try {
    const d = JSON.parse(log.details);
    return d && typeof d === 'object' ? d : null;
  } catch {
    return null;
  }
}

/** 获取被操作用户的展示名（优先邮箱，其次用户名，最后 ID 片段） */
export function formatTarget(log: AdminAction): string {
  if (log.targetEmail) return log.targetEmail;
  if (log.targetDisplayName) return log.targetDisplayName;
  if (log.targetUserId) return `#${log.targetUserId}`;
  if (log.resourceId) return `#${log.resourceId}`;
  return '未知用户';
}

/** 将审计日志翻译为自然语言（操作者 + 动作 + 目标） */
export function describeAction(log: AdminAction): string {
  const op = log.adminEmail || log.adminDisplayName || (log.adminId ? `#${log.adminId}` : '未知');
  const target = formatTarget(log);
  const d = parseDetail(log);

  switch (log.action) {
    case 'user.update':
      return `${op} 编辑了用户 ${target} 的资料`;
    case 'user.enable':
      return `${op} 启用了用户 ${target} 的账号`;
    case 'user.disable':
      return `${op} 禁用了用户 ${target} 的账号`;
    case 'user.reset_password':
      return `${op} 将用户 ${target} 的密码重置为${d?.via === 'custom' ? '自定义密码' : '默认密码'}`;
    case 'user.delete':
      return `${op} 硬删除了用户 ${(d?.email as string) || target}`;
    case 'user.create':
      return `${op} 创建了用户 ${target}`;
    case 'user.grant_role':
      return `${op} 给用户 ${target} 授予了角色 ${(d?.role_name as string) || (d?.role as string) || ''}`.trim();
    case 'user.revoke_role':
      return `${op} 收回了用户 ${target} 的角色 ${(d?.role_name as string) || (d?.role as string) || ''}`.trim();

    case 'role.create':
      return `${op} 创建了角色 ${(d?.role_name as string) || target}`;
    case 'role.update':
      return `${op} 更新了角色 ${(d?.role_name as string) || target}`;
    case 'role.delete':
      return `${op} 删除了角色 ${(d?.role_name as string) || target}`;
    case 'role.grant_permission':
      return `${op} 给角色 ${(d?.role_name as string) || target} 授予了权限`;
    case 'role.revoke_permission':
      return `${op} 收回了角色 ${(d?.role_name as string) || target} 的权限`;
    case 'role.replace_permissions':
      return `${op} 重置了角色 ${(d?.role_name as string) || target} 的权限集`;

    case 'permission.create':
      return `${op} 创建了权限 ${(d?.permission_name as string) || (d?.name as string) || target}`;
    case 'permission.update':
      return `${op} 更新了权限 ${(d?.permission_name as string) || (d?.name as string) || target}`;
    case 'permission.delete':
      return `${op} 删除了权限 ${(d?.permission_name as string) || (d?.name as string) || target}`;

    case 'event.create':
      return `${op} 创建了活动 ${(d?.title as string) || target}`;
    case 'event.update':
      return `${op} 更新了活动 ${(d?.title as string) || target}`;
    case 'event.delete':
      return `${op} 删除了活动 ${(d?.title as string) || target}`;
    case 'event.registered':
      return `${op} 登记了活动报名`;
    case 'event.cancelled':
      return `${op} 取消了活动报名`;

    case 'audit.delete':
      return `${op} 删除了单条审计日志`;
    case 'audit.delete_bulk':
      return `${op} 清除了 ${(d?.before as string) || ''} 之前的审计日志（共 ${(d?.count as number) ?? '?'} 条）`.trim();

    case 'password_reset.approve':
      return `${op} 批准了用户 ${target} 的忘记密码申请`;
    case 'password_reset.reject':
      return `${op} 拒绝了用户 ${target} 的忘记密码申请`;

    case 'auth.register':
      return `新用户注册（${target}）`;
    case 'auth.login':
      return `${target || op} 登录了系统`;
    case 'broadcast_notification':
      return `${op} 群发了站内通知`;

    default:
      return `${op} 执行了 ${log.action}，目标：${target}`;
  }
}

/** 格式化操作者名称：优先显示邮箱，被删除时显示 ID 片段 */
export function formatAdminName(log: AdminAction): string {
  if (log.adminEmail) return log.adminEmail;
  if (log.adminDisplayName) return log.adminDisplayName;
  if (log.adminId) return `#${log.adminId}（已删除）`;
  return '未知（已删除）';
}
