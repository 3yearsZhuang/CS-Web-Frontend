/**
 * @file 活动统计服务（已迁移至 Repository 抽象层，ADR-009）
 *
 * 返回所有活动的报名统计汇总（注册人数、取消人数、候补人数等）。
 */
import { getEventsRepository } from '@/shared/db/repositories/events.repo';

/** 单个活动的报名统计 */
export interface EventStat {
  eventId: string;
  title: string;
  capacity: number;
  total: number;
  registered: number;
  cancelled: number;
  waitlisted: number;
}

/** 获取所有活动的报名统计汇总（按活动日期倒序） */
export async function getEventStats(): Promise<EventStat[]> {
  const repo = getEventsRepository();
  const rows = await repo.getEventStats();

  return rows.map((row) => ({
    eventId: row.id,
    title: row.title,
    capacity: row.capacity || 0,
    total: row.total_registrations,
    registered: row.registered_count,
    cancelled: row.cancelled_count,
    waitlisted: row.waitlisted_count,
  }));
}
