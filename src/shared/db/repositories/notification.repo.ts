/**
 * @file 通知模块 Repository（ADR-009）
 *
 * 覆盖表：notifications（createNotification / 广播 / 查询 / 已读标记）
 * SQLite 专属函数（datetime('now')）保留在 SQL 文本中。
 */
import type { DbEngine, QueryParams } from '@/shared/db/drivers';
import { resolveEngine } from './base';

export interface NotificationRow {
  [key: string]: unknown;
  id: string;
  user_id: string;
  type: string;
  title: string;
  content: string | null;
  is_read: number;
  sender_id: string | null;
  created_at: string;
}

export interface NotificationRepository {
  insertNotification(
    engine: DbEngine,
    id: string,
    userId: string,
    type: string,
    title: string,
    content: string | null,
    senderId: string | null,
  ): Promise<void>;
  listActiveUserIds(eng?: DbEngine): Promise<Array<{ id: string }>>;
  getNotificationById(id: string, eng?: DbEngine): Promise<NotificationRow | null>;
  getUnreadCount(userId: string, eng?: DbEngine): Promise<number>;
  countNotifications(where: string, params: QueryParams, eng?: DbEngine): Promise<number>;
  listNotificationsFiltered(
    where: string,
    params: QueryParams,
    eng?: DbEngine,
  ): Promise<NotificationRow[]>;
  listRecentBroadcasts(limit: number, eng?: DbEngine): Promise<Array<{ title: string; content: string | null; type: string; created_at: string; cnt: number }>>;
  markRead(notificationId: string, eng?: DbEngine): Promise<void>;
  markAllRead(userId: string, eng?: DbEngine): Promise<void>;
}

function createNotificationRepository(): NotificationRepository {
  return {
    async insertNotification(engine, id, userId, type, title, content, senderId) {
      await engine.execute(
        `INSERT INTO notifications (id, user_id, type, title, content, sender_id)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [id, userId, type, title, content ?? null, senderId ?? null],
      );
    },
    async listActiveUserIds(eng) {
      const e = await resolveEngine(eng);
      return e.query<{ id: string }>('SELECT id FROM users WHERE is_active = 1');
    },
    async getNotificationById(id, eng) {
      const e = await resolveEngine(eng);
      return e.queryOne<NotificationRow>('SELECT * FROM notifications WHERE id = ?', [id]);
    },
    async getUnreadCount(userId, eng) {
      const e = await resolveEngine(eng);
      const row = await e.queryOne<{ c: number }>(
        'SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0',
        [userId],
      );
      return row?.c ?? 0;
    },
    async markRead(notificationId, eng) {
      const e = await resolveEngine(eng);
      await e.execute("UPDATE notifications SET is_read = 1 WHERE id = ?", [notificationId]);
    },
    async markAllRead(userId, eng) {
      const e = await resolveEngine(eng);
      await e.execute("UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0", [userId]);
    },
    async countNotifications(where, params, eng) {
      const e = await resolveEngine(eng);
      const row = await e.queryOne<{ count: number }>(
        `SELECT COUNT(*) AS count FROM notifications ${where}`,
        params,
      );
      return row?.count ?? 0;
    },
    async listNotificationsFiltered(where, params, eng) {
      const e = await resolveEngine(eng);
      return e.query<NotificationRow>(
        `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        params,
      );
    },
    async listRecentBroadcasts(limit, eng) {
      const e = await resolveEngine(eng);
      return e.query<{ title: string; content: string | null; type: string; created_at: string; cnt: number }>(
        `SELECT title, content, type, MAX(created_at) AS created_at, COUNT(*) AS cnt
         FROM notifications
         WHERE sender_id IS NOT NULL
         GROUP BY title, content, type
         ORDER BY MAX(created_at) DESC
         LIMIT ?`,
        [limit],
      );
    },
  };
}

let notificationRepo: NotificationRepository | null = null;

/** 同步返回 NotificationRepository 单例（实例不持引擎，延迟绑定） */
export function getNotificationRepository(): NotificationRepository {
  if (!notificationRepo) notificationRepo = createNotificationRepository();
  return notificationRepo;
}
