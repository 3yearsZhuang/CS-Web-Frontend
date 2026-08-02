/**
 * @file 通知模块 — 核心写入函数（提取自 index.ts 以打破循环依赖）
 */
import crypto from 'node:crypto';
import 'server-only';
import { getDbEngine } from '@/shared/db/drivers';
import { getNotificationRepository } from '@/shared/db/repositories';
import type { Notification, NotificationType } from '../types';

/** 通知行映射接口（DB 行结构） */
export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  content: string | null;
  is_read: number;
  sender_id: string | null;
  created_at: string;
}

/** 将 DB 行映射为对外通知对象 */
export function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.user_id,
    type: (['system', 'admin', 'activity'].includes(row.type)
      ? row.type
      : 'system') as NotificationType,
    title: row.title,
    content: row.content ?? null,
    isRead: row.is_read === 1,
    senderId: row.sender_id ?? null,
    createdAt: row.created_at,
  };
}

/** 创建单条通知 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  content?: string | null,
  senderId?: string | null,
): Promise<Notification> {
  const repo = getNotificationRepository();
  const engine = await getDbEngine();
  const id = crypto.randomUUID();

  await repo.insertNotification(engine, id, userId, type, title, content ?? null, senderId ?? null);

  const row = await repo.getNotificationById(id);
  return toNotification(row as NotificationRow);
}

/** 向所有活跃用户广播通知 */
export async function createNotificationForAll(
  type: NotificationType,
  title: string,
  content?: string | null,
  senderId?: string | null,
): Promise<number> {
  const repo = getNotificationRepository();
  const engine = await getDbEngine();

  const users = await repo.listActiveUserIds();

  let count = 0;
  await engine.transaction(async (tx) => {
    for (const user of users) {
      const id = crypto.randomUUID();
      await repo.insertNotification(tx, id, user.id, type, title, content ?? null, senderId ?? null);
      count++;
    }
  });

  return count;
}
