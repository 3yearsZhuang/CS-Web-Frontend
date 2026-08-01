/**
 * @file task.schema.ts — 任务模块 Drizzle schema 定义（tasks / claims / points_transactions）
 */
import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import {
  pgTable,
  text as pgText,
  integer as pgInteger,
  timestamp,
  index as pgIndex,
  uniqueIndex as pgUniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const tasksSqlite = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    description: text('description').notNull(),
    contentMarkdown: text('content_markdown'),
    category: text('category').notNull().default('general'),
    tags: text('tags').default('[]'),
    points: integer('points').notNull().default(10),
    maxClaimants: integer('max_claimants').notNull().default(1),
    status: text('status').notNull().default('draft'),
    createdBy: text('created_by').notNull(),
    publishedAt: text('published_at'),
    closedAt: text('closed_at'),
    createdAt: text('created_at').default(sql`datetime('now')`),
    updatedAt: text('updated_at').default(sql`datetime('now')`),
  },
  (table) => ({
    statusIdx: index('idx_tasks_status').on(table.status),
    categoryIdx: index('idx_tasks_category').on(table.category),
    createdByIdx: index('idx_tasks_created_by').on(table.createdBy),
  }),
);

export const tasksPg = pgTable(
  'tasks',
  {
    id: pgText('id').primaryKey(),
    title: pgText('title').notNull(),
    description: pgText('description').notNull(),
    contentMarkdown: pgText('content_markdown'),
    category: pgText('category').notNull().default('general'),
    tags: pgText('tags').default('[]'),
    points: pgInteger('points').notNull().default(10),
    maxClaimants: pgInteger('max_claimants').notNull().default(1),
    status: pgText('status').notNull().default('draft'),
    createdBy: pgText('created_by').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    statusIdx: pgIndex('idx_tasks_status').on(table.status),
    categoryIdx: pgIndex('idx_tasks_category').on(table.category),
    createdByIdx: pgIndex('idx_tasks_created_by').on(table.createdBy),
  }),
);

export const taskClaimsSqlite = sqliteTable(
  'task_claims',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id').notNull(),
    userId: text('user_id').notNull(),
    status: text('status').notNull().default('claimed'),
    claimNote: text('claim_note'),
    completedAt: text('completed_at'),
    reviewedBy: text('reviewed_by'),
    reviewNote: text('review_note'),
    createdAt: text('created_at').default(sql`datetime('now')`),
  },
  (table) => ({
    taskIdIdx: index('idx_task_claims_task_id').on(table.taskId),
    userIdIdx: index('idx_task_claims_user_id').on(table.userId),
    statusIdx: index('idx_task_claims_status').on(table.status),
    // UNIQUE(task_id, user_id) — 防止重复认领
    taskUserUniqueIdx: uniqueIndex('idx_task_claims_unique').on(table.taskId, table.userId),
  }),
);

export const taskClaimsPg = pgTable(
  'task_claims',
  {
    id: pgText('id').primaryKey(),
    taskId: pgText('task_id').notNull(),
    userId: pgText('user_id').notNull(),
    status: pgText('status').notNull().default('claimed'),
    claimNote: pgText('claim_note'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    reviewedBy: pgText('reviewed_by'),
    reviewNote: pgText('review_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    taskIdIdx: pgIndex('idx_task_claims_task_id').on(table.taskId),
    userIdIdx: pgIndex('idx_task_claims_user_id').on(table.userId),
    statusIdx: pgIndex('idx_task_claims_status').on(table.status),
    taskUserUniqueIdx: pgUniqueIndex('idx_task_claims_unique').on(table.taskId, table.userId),
  }),
);

// balanceAfter 记录变更后余额，便于审计与对账
export const pointsTransactionsSqlite = sqliteTable(
  'points_transactions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    amount: integer('amount').notNull().default(0),
    reason: text('reason').notNull(),
    sourceType: text('source_type').notNull().default('system'),
    sourceId: text('source_id'),
    balanceAfter: integer('balance_after').notNull().default(0),
    createdAt: text('created_at').default(sql`datetime('now')`),
  },
  (table) => ({
    userIdIdx: index('idx_points_user').on(table.userId),
    createdAtIdx: index('idx_points_created').on(table.createdAt),
  }),
);

export const pointsTransactionsPg = pgTable(
  'points_transactions',
  {
    id: pgText('id').primaryKey(),
    userId: pgText('user_id').notNull(),
    amount: pgInteger('amount').notNull().default(0),
    reason: pgText('reason').notNull(),
    sourceType: pgText('source_type').notNull().default('system'),
    sourceId: pgText('source_id'),
    balanceAfter: pgInteger('balance_after').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    userIdIdx: pgIndex('idx_points_user').on(table.userId),
    createdAtIdx: pgIndex('idx_points_created').on(table.createdAt),
  }),
);

export interface TaskSchemaSet {
  tasks: typeof tasksSqlite | typeof tasksPg;
  taskClaims: typeof taskClaimsSqlite | typeof taskClaimsPg;
  pointsTransactions: typeof pointsTransactionsSqlite | typeof pointsTransactionsPg;
}

export function getTaskSchema(): TaskSchemaSet {
  if (process.env.DATABASE_PROVIDER === 'pg') {
    return {
      tasks: tasksPg,
      taskClaims: taskClaimsPg,
      pointsTransactions: pointsTransactionsPg,
    };
  }
  return {
    tasks: tasksSqlite,
    taskClaims: taskClaimsSqlite,
    pointsTransactions: pointsTransactionsSqlite,
  };
}
