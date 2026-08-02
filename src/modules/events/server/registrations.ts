/**
 * @file 活动报名列表服务（管理员视角，已迁移至 Repository 抽象层，ADR-009）
 *
 * 提供带用户信息的报名列表查询，供管理员后台使用。
 */
import { getEventsRepository } from '@/shared/db/repositories/events.repo';

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
export async function listRegistrations(eventId: string): Promise<AdminEventRegistration[]> {
  const repo = getEventsRepository();
  const rows = await repo.listRegistrations(eventId);

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
