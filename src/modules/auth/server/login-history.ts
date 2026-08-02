/**
 * @file 登录历史记录 — 成功/失败均记录，用于安全监控
 *
 * 用户不存在时 user_id 为 null 仅记 attempted_email，在认证判定后调用不影响时序均衡。
 */

import crypto from 'node:crypto';
import type { LoginHistoryEntry } from '../types';
import { getAuthRepository } from '@/shared/db/repositories/auth.repo';

// 向本文件消费方 re-export，保持 './login-history' 引用便利
export type { LoginHistoryEntry };

/** 记录登录历史 — 用户不存在时 user_id 为 null 仅记 attempted_email；在认证判定后调用不影响时序均衡 */
export async function recordLoginHistory(
  userId: string | null,
  ip?: string,
  userAgent?: string,
  success = true,
  attemptedEmail?: string,
): Promise<void> {
  const repo = await getAuthRepository();
  await repo.insertLoginHistory({
    id: crypto.randomBytes(16).toString('hex'),
    userId,
    ip: ip ?? null,
    userAgent: userAgent ?? null,
    success: success ? 1 : 0,
    attemptedEmail: attemptedEmail ?? null,
  });
}

/**
 * 获取用户的最近登录历史
 */
export async function getLoginHistory(userId: string, limit = 20): Promise<LoginHistoryEntry[]> {
  const repo = await getAuthRepository();
  const rows = await repo.listLoginHistory(userId, limit);
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id ?? '',
    ip: r.ip,
    userAgent: r.user_agent,
    success: r.success === 1,
    createdAt: r.created_at,
  }));
}
