/**
 * @file 通知模块 — 共享类型
 */

/** 通知类型：系统通知、管理员通知、活动通知，以及社区互动通知 */
export type NotificationType =
  | 'system'
  | 'admin'
  | 'activity'
  | 'like'
  | 'reply'
  | 'favorite'
  | 'follow';

/** 站内通知 */
export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  content: string | null;
  isRead: boolean;
  senderId: string | null;
  createdAt: string;
}

/** 分页通知列表 */
export interface PaginatedNotifications {
  notifications: Notification[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 广播通知记录 */
export interface BroadcastRecord {
  title: string;
  content: string | null;
  type: NotificationType;
  createdAt: string;
  recipientCount: number;
}