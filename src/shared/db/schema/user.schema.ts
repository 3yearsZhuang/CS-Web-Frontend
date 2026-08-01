/**
 * @file user.schema.ts — 用户模块 Drizzle schema 定义（users / sessions / login_history）
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

export const usersSqlite = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').unique().notNull(),
    passwordHash: text('password_hash').notNull(),
    displayName: text('display_name'),
    bio: text('bio'),
    avatarUrl: text('avatar_url'),
    avatarType: text('avatar_type').default('initial'),
    githubUrl: text('github_url'),
    websiteUrl: text('website_url'),
    role: text('role').notNull().default('user'),
    isActive: integer('is_active').notNull().default(1),
    githubId: text('github_id'),
    techTags: text('tech_tags').default('[]'),
    createdAt: text('created_at').default(sql`datetime('now')`),
    updatedAt: text('updated_at').default(sql`datetime('now')`),
  },
  (table) => ({
    emailIdx: index('idx_users_email').on(table.email),
    // SQLite ALTER TABLE 不支持 ADD COLUMN UNIQUE，用唯一索引实现
    githubIdIdx: uniqueIndex('idx_users_github_id').on(table.githubId),
    // partial unique index — 保证 root 角色全局唯一
    rootUniqueIdx: uniqueIndex('idx_users_root_unique').on(table.id).where(sql`role = 'root'`),
  }),
);

export const sessionsSqlite = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    expiresAt: text('expires_at').notNull(),
    ip: text('ip'),
    userAgent: text('user_agent'),
    createdAt: text('created_at').default(sql`datetime('now')`),
  },
  (table) => ({
    userIdIdx: index('idx_sessions_user_id').on(table.userId),
    expiresAtIdx: index('idx_sessions_expires_at').on(table.expiresAt),
  }),
);

// userId 可空：登录失败时无对应用户；attemptedEmail 用于检测撞库
export const loginHistorySqlite = sqliteTable(
  'login_history',
  {
    id: text('id').primaryKey(),
    userId: text('user_id'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    success: integer('success').notNull().default(1),
    attemptedEmail: text('attempted_email'),
    createdAt: text('created_at').default(sql`datetime('now')`),
  },
  (table) => ({
    userIdIdx: index('idx_login_history_user_id').on(table.userId),
    createdAtIdx: index('idx_login_history_created_at').on(table.createdAt),
    userCreatedIdx: index('idx_login_history_user').on(table.userId, table.createdAt),
    emailCreatedIdx: index('idx_login_history_attempted_email').on(
      table.attemptedEmail,
      table.createdAt,
    ),
  }),
);

// is_active 用 integer 保持与 SQLite 一致的 0/1 语义
export const usersPg = pgTable(
  'users',
  {
    id: pgText('id').primaryKey(),
    email: pgText('email').unique().notNull(),
    passwordHash: pgText('password_hash').notNull(),
    displayName: pgText('display_name'),
    bio: pgText('bio'),
    avatarUrl: pgText('avatar_url'),
    avatarType: pgText('avatar_type').default('initial'),
    githubUrl: pgText('github_url'),
    websiteUrl: pgText('website_url'),
    role: pgText('role').notNull().default('user'),
    isActive: pgInteger('is_active').notNull().default(1),
    githubId: pgText('github_id'),
    techTags: pgText('tech_tags').default('[]'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    emailIdx: pgIndex('idx_users_email').on(table.email),
    githubIdIdx: pgUniqueIndex('idx_users_github_id').on(table.githubId),
    rootUniqueIdx: pgUniqueIndex('idx_users_root_unique').on(table.id).where(sql`role = 'root'`),
  }),
);

export const sessionsPg = pgTable(
  'sessions',
  {
    id: pgText('id').primaryKey(),
    userId: pgText('user_id').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    ip: pgText('ip'),
    userAgent: pgText('user_agent'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    userIdIdx: pgIndex('idx_sessions_user_id').on(table.userId),
    expiresAtIdx: pgIndex('idx_sessions_expires_at').on(table.expiresAt),
  }),
);

export const loginHistoryPg = pgTable(
  'login_history',
  {
    id: pgText('id').primaryKey(),
    userId: pgText('user_id'),
    ip: pgText('ip'),
    userAgent: pgText('user_agent'),
    success: pgInteger('success').notNull().default(1),
    attemptedEmail: pgText('attempted_email'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    userIdIdx: pgIndex('idx_login_history_user_id').on(table.userId),
    createdAtIdx: pgIndex('idx_login_history_created_at').on(table.createdAt),
    userCreatedIdx: pgIndex('idx_login_history_user').on(table.userId, table.createdAt),
    emailCreatedIdx: pgIndex('idx_login_history_attempted_email').on(
      table.attemptedEmail,
      table.createdAt,
    ),
  }),
);

export interface UserSchemaSet {
  users: typeof usersSqlite | typeof usersPg;
  sessions: typeof sessionsSqlite | typeof sessionsPg;
  loginHistory: typeof loginHistorySqlite | typeof loginHistoryPg;
}

export function getUserSchema(): UserSchemaSet {
  if (process.env.DATABASE_PROVIDER === 'pg') {
    return {
      users: usersPg,
      sessions: sessionsPg,
      loginHistory: loginHistoryPg,
    };
  }
  return {
    users: usersSqlite,
    sessions: sessionsSqlite,
    loginHistory: loginHistorySqlite,
  };
}
