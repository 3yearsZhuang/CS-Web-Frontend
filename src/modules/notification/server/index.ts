/**
 * @file 站内通知服务 — 创建、查询、标记已读（核心写入函数在 notification-core.ts）
 */
import 'server-only';
import { AppError } from '@/shared/app-error';
import { computePagination, computeTotalPages } from '@/shared/utils/pagination';
import { getNotificationRepository } from '@/shared/db/repositories';
import type { QueryParams } from '@/shared/db/drivers';
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
export async function listNotifications(
  userId: string,
  options?: ListNotificationsOptions,
): Promise<PaginatedNotifications> {
  const repo = getNotificationRepository();

  const whereClauses: string[] = ['user_id = ?'];
  const params: QueryParams = [userId];

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

  const total = await repo.countNotifications(whereSql, params);
  const totalPages = computeTotalPages(total, pageSize);

  const rows = await repo.listNotificationsFiltered(whereSql, [...params, pageSize, offset] as QueryParams);

  return {
    notifications: rows.map((r) => toNotification(r as NotificationRow)),
    total,
    page,
    pageSize,
    totalPages,
  };
}

/** 标记单条通知为已读 */
export async function markAsRead(userId: string, notificationId: string): Promise<void> {
  const repo = getNotificationRepository();
  const row = await repo.getNotificationById(notificationId);
  if (!row) throw new AppError('通知不存在', 'NOT_FOUND');
  if (row.user_id !== userId) throw new AppError('无权操作此通知', 'FORBIDDEN');

  await repo.markRead(notificationId);
}

/** 标记所有通知为已读 */
export async function markAllAsRead(userId: string): Promise<number> {
  const repo = getNotificationRepository();
  await repo.markAllRead(userId);
  return 0;
}

/** 获取未读通知数量 */
export async function getUnreadCount(userId: string): Promise<number> {
  const repo = getNotificationRepository();
  return repo.getUnreadCount(userId);
}

/** 发送欢迎通知 */
export async function notifyWelcome(userId: string): Promise<void> {
  await createNotification(
    userId,
    'system',
    '欢迎加入',
    '欢迎加入我们的社区！在这里你可以参与各类活动，结识志同道合的伙伴。',
  );
}

/** 发送活动报名成功通知 */
export async function notifyEventRegistered(userId: string, eventTitle: string): Promise<void> {
  await createNotification(
    userId,
    'activity',
    '活动报名成功',
    `你已成功报名「${eventTitle}」，我们期待你的参与！`,
  );
}

/** 发送活动取消报名通知 */
export async function notifyEventCancelled(userId: string, eventTitle: string): Promise<void> {
  await createNotification(
    userId,
    'activity',
    '活动取消报名',
    `你已取消「${eventTitle}」的报名。如有疑问请联系管理员。`,
  );
}

/** 向所有用户广播新活动通知 */
export async function notifyNewEventForAll(
  eventTitle: string,
  eventDescription?: string | null,
  senderId?: string | null,
): Promise<number> {
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
export async function listRecentBroadcasts(limit = 20): Promise<BroadcastRecord[]> {
  const repo = getNotificationRepository();
  const rows = await repo.listRecentBroadcasts(Math.min(100, Math.max(1, limit)));

  return rows.map((r) => ({
    title: r.title,
    content: r.content ?? null,
    type: (['system', 'admin', 'activity', 'like', 'reply', 'favorite', 'follow'].includes(r.type)
      ? r.type
      : 'system') as NotificationType,
    createdAt: r.created_at,
    recipientCount: r.cnt,
  }));
}
