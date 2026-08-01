/**
 * @file audit.schema.ts — admin_actions 表的 Drizzle schema 定义（SQLite + PG 双引擎）
 */
import { sqliteTable, text, index } from 'drizzle-orm/sqlite-core';
import { pgTable, text as pgText, timestamp, index as pgIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// extraConfig 统一用对象形式以获得更稳定的类型推断
export const adminActionsSqlite = sqliteTable(
  'admin_actions',
  {
    id: text('id').primaryKey(),
    adminId: text('admin_id'),
    action: text('action').notNull(),
    targetUserId: text('target_user_id'),
    details: text('details'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    createdAt: text('created_at').default(sql`datetime('now')`),
  },
  (table) => ({
    adminIdIdx: index('idx_admin_actions_admin_id').on(table.adminId),
    targetUserIdIdx: index('idx_admin_actions_target_user_id').on(table.targetUserId),
    createdAtIdx: index('idx_admin_actions_created_at').on(table.createdAt),
  }),
);

// PG 官方推荐 text 而非 varchar，性能无差异且避免泛型推断问题
export const adminActionsPg = pgTable(
  'admin_actions',
  {
    id: pgText('id').primaryKey(),
    adminId: pgText('admin_id'),
    action: pgText('action').notNull(),
    targetUserId: pgText('target_user_id'),
    details: pgText('details'),
    ip: pgText('ip'),
    userAgent: pgText('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    adminIdIdx: pgIndex('idx_admin_actions_admin_id').on(table.adminId),
    targetUserIdIdx: pgIndex('idx_admin_actions_target_user_id').on(table.targetUserId),
    createdAtIdx: pgIndex('idx_admin_actions_created_at').on(table.createdAt),
  }),
);

export type AdminActionsSchema = typeof adminActionsSqlite | typeof adminActionsPg;

export function getAuditSchema(): AdminActionsSchema {
  return process.env.DATABASE_PROVIDER === 'pg' ? adminActionsPg : adminActionsSqlite;
}
