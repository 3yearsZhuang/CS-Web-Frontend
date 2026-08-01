/**
 * @file 登录历史记录 — 成功/失败均记录，用于安全监控
 *
 * 用户不存在时 user_id 为 null 仅记 attempted_email，在认证判定后调用不影响时序均衡。
 */

import crypto from 'node:crypto';
import { getDb } from '@/shared/db';
import type { LoginHistoryEntry } from '../types';

// 向本文件消费方 re-export，保持 './login-history' 引用便利
export type { LoginHistoryEntry };

/** 记录登录历史 — 用户不存在时 user_id 为 null 仅记 attempted_email；在认证判定后调用不影响时序均衡 */
export function recordLoginHistory(
  userId: string | null,
  ip?: string,
  userAgent?: string,
  success = true,
  attemptedEmail?: string,
): void {
  const db = getDb();
  const id = crypto.randomBytes(16).toString('hex');
  db.prepare(
    'INSERT INTO login_history (id, user_id, ip, user_agent, success, attempted_email) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(id, userId ?? null, ip ?? null, userAgent ?? null, success ? 1 : 0, attemptedEmail ?? null);
}

/**
 * 获取用户的最近登录历史
 */
export function getLoginHistory(userId: string, limit = 20): LoginHistoryEntry[] {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM login_history WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
  ).all(userId, limit) as Array<{
    id: string;
    user_id: string;
    ip: string | null;
    user_agent: string | null;
    success: number;
    created_at: string;
  }>;
  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    ip: r.ip,
    userAgent: r.user_agent,
    success: r.success === 1,
    createdAt: r.created_at,
  }));
}
