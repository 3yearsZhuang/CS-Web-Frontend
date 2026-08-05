/**
 * @file 管理员审计日志 — 展示工具函数（从 admin-logs-panel 拆出，遵循 2.4 关注点拆分）
 */

import type { AdminAction } from '@/modules/admin/ui/types';

/** 将审计日志翻译为自然语言 */
export function describeAction(log: AdminAction): string {
  const op = log.adminEmail || log.adminDisplayName || (log.adminId ? log.adminId.slice(0, 8) : '未知');
  const target = log.targetEmail || log.targetDisplayName || log.targetUserId?.slice(0, 8) || '未知用户';
  let details = '';
  try {
    if (log.details) {
      const d = JSON.parse(log.details);
      if (log.action === 'update_user') {
        const changes: string[] = [];
        if (d.role) changes.push(`角色 → ${d.role.to}`);
        if (d.displayName) changes.push(`显示名 → ${d.displayName.to}`);
        if (d.bio) changes.push(`简介已更新`);
        if (d.isActive !== undefined) changes.push(d.isActive.to ? '已启用' : '已禁用');
        details = changes.length > 0 ? `（${changes.join('、')}）` : '';
      }
      if (log.action === 'enable_user') details = `（启用账号）`;
      if (log.action === 'disable_user') details = `（禁用账号）`;
      if (log.action === 'reset_password_default') details = `（重置为默认密码 FZTBU_CS）`;
      if (log.action === 'reset_password_custom') details = `（自定义重置密码）`;
      if (log.action === 'delete_user') {
        const email = d.email || target;
        details = `（硬删除用户 ${email}，含所有 sessions / 活动报名数据）`;
      }
      if (log.action === 'delete_log') {
        details = `（删除 ${d.before} 之前的审计日志，共 ${d.count} 条）`;
      }
      if (log.action === 'approve_password_reset') {
        details = `（批准了 ${d.email} 的忘记密码申请）`;
      }
    }
  } catch {
    /* ignore parse error */
  }
  switch (log.action) {
    case 'update_user':
      return `${op} 编辑了用户 ${target} 的资料${details}`;
    case 'enable_user':
      return `${op} 启用了用户 ${target} 的账号`;
    case 'disable_user':
      return `${op} 禁用了用户 ${target} 的账号`;
    case 'reset_password_default':
      return `${op} 将用户 ${target} 的密码重置为默认密码 FZTBU_CS`;
    case 'reset_password_custom':
      return `${op} 将用户 ${target} 的密码重置为自定义密码`;
    case 'delete_user':
      return `${op} 硬删除了用户 ${target}`;
    case 'delete_log':
      return `${op} 清除了审计日志`;
    case 'approve_password_reset':
      return `${op} 批准了用户 ${target} 的忘记密码申请`;
    default:
      return `${op} 执行了 ${log.action}，目标：${target}`;
  }
}

/** 格式化操作者名称：优先显示邮箱，被删除时显示 ID 片段 */
export function formatAdminName(log: AdminAction): string {
  if (log.adminEmail) return log.adminEmail;
  if (log.adminDisplayName) return log.adminDisplayName;
  if (log.adminId) return `${log.adminId.slice(0, 8)}…（已删除）`;
  return '未知（已删除）';
}
