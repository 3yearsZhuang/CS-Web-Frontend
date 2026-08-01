/**
 * @file 通知模块 — 核心写入函数（提取自 index.ts 以打破循环依赖）
 */
import crypto from 'node:crypto';
import 'server-only';
import { getDb } from '@/shared/db';
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
export function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  content?: string | null,
  senderId?: string | null,
): Notification {
  const db = getDb();
  const id = crypto.randomUUID();

  db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, content, sender_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    userId,
    type,
    title,
    content ?? null,
    senderId ?? null,
  );

  const row = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id) as NotificationRow;
  return toNotification(row);
}

/** 向所有活跃用户广播通知 */
export function createNotificationForAll(
  type: NotificationType,
  title: string,
  content?: string | null,
  senderId?: string | null,
): number {
  const db = getDb();

  const users = db.prepare('SELECT id FROM users WHERE is_active = 1').all() as Array<{ id: string }>;

  const insert = db.prepare(
    `INSERT INTO notifications (id, user_id, type, title, content, sender_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
  );

  let count = 0;
  const tx = db.transaction(() => {
    for (const user of users) {
      const id = crypto.randomUUID();
      insert.run(
        id,
        user.id,
        type,
        title,
        content ?? null,
        senderId ?? null,
      );
      count++;
    }
  });

  tx();
  return count;
}
