/**
 * @file 审计日志基础设施 — logAdminAction 供各业务模块复用
 */

import crypto from 'node:crypto';
import 'server-only';
import { getDb } from '@/shared/db';
import { maskSensitiveFields } from '@/shared/utils/mask';
import type { AuditContext } from '@/shared/types';

export type { AuditContext };

/** 记录管理员操作审计日志 — details 中敏感字段自动脱敏后存储 */
export function logAdminAction(
  adminId: string,
  action: string,
  targetUserId: string | null,
  details?: Record<string, unknown> | null,
  ip?: string | null,
  userAgent?: string | null,
): void {
  const db = getDb();
  const id = crypto.randomUUID();
  const maskedDetails = details ? maskSensitiveFields(details) : null;
  const detailsStr = maskedDetails ? JSON.stringify(maskedDetails) : null;
  db.prepare(
    'INSERT INTO admin_actions (id, admin_id, action, target_user_id, details, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(id, adminId, action, targetUserId, detailsStr, ip ?? null, userAgent ?? null);
}
