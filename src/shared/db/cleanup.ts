/**
 * @file 清理过期数据 — 过期验证码与超时密码重置申请
 */
import type { Database as DB } from 'better-sqlite3';

/**
 * 清理过期验证码 + 超时重置申请
 *
 * verification_codes 删除已过期记录；password_reset_requests 超 24h pending 标记 rejected（防 DB 膨胀）。
 */
export function cleanupExpiredData(db: DB): void {
  db.prepare("DELETE FROM verification_codes WHERE expires_at < datetime('now')").run();
  // 超时未处理的 pending 重置申请标记为 expired（rejected + admin_note 标识）
  db.prepare(
    `UPDATE password_reset_requests
     SET status = 'rejected', admin_note = COALESCE(admin_note, '系统自动过期（超过 24 小时未处理）'),
         resolved_at = datetime('now')
     WHERE status = 'pending' AND created_at < datetime('now', '-24 hours')`,
  ).run();
}
