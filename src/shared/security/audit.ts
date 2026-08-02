/**
 * @file 审计日志基础设施 — logAdminAction 供各业务模块复用
 */

import 'server-only';
import { maskSensitiveFields } from '@/shared/utils/mask';
import type { AuditContext } from '@/shared/types';
import { getAuditRepository } from '@/shared/db/repositories/audit.repo';

export type { AuditContext };

/**
 * 记录管理员操作审计日志 — details 中敏感字段自动脱敏后存储
 *
 * ADR-009：经 AuditRepository 访问，不再直连 getDb()。调用方需 await。
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  targetUserId: string | null,
  details?: Record<string, unknown> | null,
  ip?: string | null,
  userAgent?: string | null,
): Promise<void> {
  const maskedDetails = details ? maskSensitiveFields(details) : null;
  await getAuditRepository().then((repo) =>
    repo.insert({
      adminId,
      action,
      targetUserId,
      details: maskedDetails,
      ip,
      userAgent,
    }),
  );
}
