/**
 * @file 活动统计服务
 *
 * 返回所有活动的报名统计汇总（注册人数、取消人数、候补人数等）。
 */

import { getDb } from '@/shared/db';

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
export function getEventStats(): EventStat[] {
  const db = getDb();

  const rows = db
    .prepare(
      `SELECT
        e.id,
        e.title,
        e.capacity,
        COUNT(er.id) as total_registrations,
        SUM(CASE WHEN er.status = 'registered' THEN 1 ELSE 0 END) as registered_count,
        SUM(CASE WHEN er.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
        SUM(CASE WHEN er.status = 'waitlisted' THEN 1 ELSE 0 END) as waitlisted_count
      FROM events e
      LEFT JOIN event_registrations er ON e.id = er.event_id
      GROUP BY e.id
      ORDER BY e.date DESC`,
    )
    .all() as Array<{
      id: string;
      title: string;
      capacity: number;
      total_registrations: number;
      registered_count: number;
      cancelled_count: number;
      waitlisted_count: number;
    }>;

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
