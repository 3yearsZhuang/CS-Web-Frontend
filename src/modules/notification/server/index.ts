/**
 * @file 站内通知服务 — 创建、查询、标记已读（核心写入函数在 notification-core.ts）
 */
import 'server-only';
import { getDb } from '@/shared/db';
import { AppError } from '@/shared/app-error';
import { computePagination, computeTotalPages } from '@/shared/utils/pagination';
import type {
  BroadcastRecord,
  Notification,
  NotificationType,
  PaginatedNotifications,
} from '../types';
import {
  createNotification,
  createNotificationForAll,
  toNotification,
  type NotificationRow,
} from './notification-core';

export { initNotificationEvents } from './notification-events';
// 再导出核心写入函数，保持公开 API 不变
export { createNotification, createNotificationForAll };
export type { BroadcastRecord, Notification, NotificationType, PaginatedNotifications };

interface ListNotificationsOptions {
  isRead?: boolean;
  type?: NotificationType;
  page?: number;
  pageSize?: number;
}

/** 列出用户的通知，支持分页和筛选 */
export function listNotifications(
  userId: string,
  options?: ListNotificationsOptions,
): PaginatedNotifications {
  const db = getDb();

  const whereClauses: string[] = ['user_id = ?'];
  const params: unknown[] = [userId];

  if (options?.isRead !== undefined) {
    whereClauses.push('is_read = ?');
    params.push(options.isRead ? 1 : 0);
  }

  if (options?.type !== undefined) {
    whereClauses.push('type = ?');
    params.push(options.type);
  }

  const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

  const { page, pageSize, offset } = computePagination({
    page: options?.page,
    pageSize: options?.pageSize,
    defaultPageSize: 20,
    maxPageSize: 100,
  });

  const totalRow = db
    .prepare(`SELECT COUNT(*) as count FROM notifications ${whereSql}`)
    .get(...params) as { count: number };
  const total = totalRow.count;
  const totalPages = computeTotalPages(total, pageSize);

  const rows = db
    .prepare(
      `SELECT * FROM notifications ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    )
    .all(...params, pageSize, offset) as NotificationRow[];

  return {
    notifications: rows.map(toNotification),
    total,
    page,
    pageSize,
    totalPages,
  };
}

/** 标记单条通知为已读 */
export function markAsRead(userId: string, notificationId: string): void {
  const db = getDb();
  const row = db.prepare('SELECT * FROM notifications WHERE id = ?').get(notificationId) as
    | NotificationRow
    | undefined;

  if (!row) throw new AppError('通知不存在', 'NOT_FOUND');
  if (row.user_id !== userId) throw new AppError('无权操作此通知', 'FORBIDDEN');

  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ?').run(notificationId);
}

/** 标记所有通知为已读 */
export function markAllAsRead(userId: string): number {
  const db = getDb();

  const result = db
    .prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0')
    .run(userId);

  return result.changes;
}

/** 获取未读通知数量 */
export function getUnreadCount(userId: string): number {
  const db = getDb();
  const row = db
    .prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0')
    .get(userId) as { count: number };
  return row.count;
}

/** 发送欢迎通知 */
export function notifyWelcome(userId: string): void {
  createNotification(
    userId,
    'system',
    '欢迎加入',
    '欢迎加入我们的社区！在这里你可以参与各类活动，结识志同道合的伙伴。',
  );
}

/** 发送活动报名成功通知 */
export function notifyEventRegistered(userId: string, eventTitle: string): void {
  createNotification(
    userId,
    'activity',
    '活动报名成功',
    `你已成功报名「${eventTitle}」，我们期待你的参与！`,
  );
}

/** 发送活动取消报名通知 */
export function notifyEventCancelled(userId: string, eventTitle: string): void {
  createNotification(
    userId,
    'activity',
    '活动取消报名',
    `你已取消「${eventTitle}」的报名。如有疑问请联系管理员。`,
  );
}

/** 向所有用户广播新活动通知 */
export function notifyNewEventForAll(
  eventTitle: string,
  eventDescription?: string | null,
  senderId?: string | null,
): number {
  const content = eventDescription
    ? `${eventDescription}\n\n点击通知或前往「活动」页面查看详情。`
    : '点击通知或前往「活动」页面查看详情。';
  return createNotificationForAll(
    'activity',
    `新活动发布：${eventTitle}`,
    content,
    senderId ?? null,
  );
}

/** 列出最近的广播通知 */
export function listRecentBroadcasts(limit = 20): BroadcastRecord[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT title,
              content,
              type,
              MAX(created_at) AS created_at,
              COUNT(*) AS cnt
         FROM notifications
        WHERE sender_id IS NOT NULL
        GROUP BY title, content, type
        ORDER BY MAX(created_at) DESC
        LIMIT ?`,
    )
    .all(Math.min(100, Math.max(1, limit))) as Array<{
    title: string;
    content: string | null;
    type: string;
    created_at: string;
    cnt: number;
  }>;

  return rows.map((r) => ({
    title: r.title,
    content: r.content ?? null,
    type: (['system', 'admin', 'activity'].includes(r.type)
      ? r.type
      : 'system') as NotificationType,
    createdAt: r.created_at,
    recipientCount: r.cnt,
  }));
}
