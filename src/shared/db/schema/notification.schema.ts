/**
 * @file notification.schema.ts — 通知模块 Drizzle schema 定义（notifications / announcements）
 */
import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import {
  pgTable,
  text as pgText,
  integer as pgInteger,
  timestamp,
  index as pgIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const notificationsSqlite = sqliteTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    content: text('content'),
    isRead: integer('is_read').notNull().default(0),
    senderId: text('sender_id'),
    createdAt: text('created_at').default(sql`datetime('now')`),
  },
  (table) => ({
    userIdIdx: index('idx_notifications_user_id').on(table.userId),
    isReadIdx: index('idx_notifications_is_read').on(table.isRead),
  }),
);

export const notificationsPg = pgTable(
  'notifications',
  {
    id: pgText('id').primaryKey(),
    userId: pgText('user_id').notNull(),
    type: pgText('type').notNull(),
    title: pgText('title').notNull(),
    content: pgText('content'),
    isRead: pgInteger('is_read').notNull().default(0),
    senderId: pgText('sender_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    userIdIdx: pgIndex('idx_notifications_user_id').on(table.userId),
    isReadIdx: pgIndex('idx_notifications_is_read').on(table.isRead),
  }),
);

// targetRoles: JSON 数组，NULL 表示所有人可见
export const announcementsSqlite = sqliteTable(
  'announcements',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    content: text('content'),
    level: text('level').notNull().default('info'),
    isActive: integer('is_active').notNull().default(1),
    isDismissible: integer('is_dismissible').notNull().default(1),
    priority: integer('priority').notNull().default(0),
    expiresAt: text('expires_at'),
    targetRoles: text('target_roles'),
    createdBy: text('created_by').notNull(),
    createdAt: text('created_at').default(sql`datetime('now')`),
    updatedAt: text('updated_at').default(sql`datetime('now')`),
  },
  (table) => ({
    isActiveIdx: index('idx_announcements_is_active').on(table.isActive),
    priorityIdx: index('idx_announcements_priority').on(table.priority),
  }),
);

export const announcementsPg = pgTable(
  'announcements',
  {
    id: pgText('id').primaryKey(),
    title: pgText('title').notNull(),
    content: pgText('content'),
    level: pgText('level').notNull().default('info'),
    isActive: pgInteger('is_active').notNull().default(1),
    isDismissible: pgInteger('is_dismissible').notNull().default(1),
    priority: pgInteger('priority').notNull().default(0),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    targetRoles: pgText('target_roles'),
    createdBy: pgText('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    isActiveIdx: pgIndex('idx_announcements_is_active').on(table.isActive),
    priorityIdx: pgIndex('idx_announcements_priority').on(table.priority),
  }),
);

export interface NotificationSchemaSet {
  notifications: typeof notificationsSqlite | typeof notificationsPg;
  announcements: typeof announcementsSqlite | typeof announcementsPg;
}

export function getNotificationSchema(): NotificationSchemaSet {
  if (process.env.DATABASE_PROVIDER === 'pg') {
    return {
      notifications: notificationsPg,
      announcements: announcementsPg,
    };
  }
  return {
    notifications: notificationsSqlite,
    announcements: announcementsSqlite,
  };
}
