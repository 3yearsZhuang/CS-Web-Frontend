/**
 * @file 活动报名列表服务（管理员视角）
 *
 * 提供带用户信息的报名列表查询，供管理员后台使用。
 */

import { getDb } from '@/shared/db';

/** 管理员视角的报名记录（含用户邮箱与昵称） */
export interface AdminEventRegistration {
  id: string;
  userId: string;
  eventId: string;
  status: string;
  formData: Record<string, string> | null;
  registeredAt: string;
  cancelledAt: string | null;
  email: string | null;
  displayName: string | null;
}

/** 列出某活动的所有报名记录（含用户信息，按报名时间升序） */
export function listRegistrations(eventId: string): AdminEventRegistration[] {
  const db = getDb();

  const rows = db
    .prepare(
      `SELECT r.id, r.user_id, r.event_id, r.status, r.form_data, r.registered_at, r.cancelled_at,
              u.email, u.display_name
       FROM event_registrations r
       LEFT JOIN users u ON r.user_id = u.id
       WHERE r.event_id = ?
       ORDER BY r.registered_at ASC`,
    )
    .all(eventId) as Array<{
      id: string;
      user_id: string;
      event_id: string;
      status: string;
      form_data: string | null;
      registered_at: string;
      cancelled_at: string | null;
      email: string | null;
      display_name: string | null;
    }>;

  return rows.map((r) => {
    let formData: Record<string, string> | null = null;
    try {
      if (r.form_data) formData = JSON.parse(r.form_data) as Record<string, string>;
    } catch { /* ignore */ }
    return {
      id: r.id,
      userId: r.user_id,
      eventId: r.event_id,
      status: r.status,
      formData,
      registeredAt: r.registered_at,
      cancelledAt: r.cancelled_at,
      email: r.email,
      displayName: r.display_name,
    };
  });
}
