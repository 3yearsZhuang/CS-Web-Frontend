/**
 * @file system.schema.ts — 系统/资源模块 Drizzle schema 定义（verification_codes / reset_requests / component_registry / resources / join_applications / settings）
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

export const verificationCodesSqlite = sqliteTable(
  'verification_codes',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    codeHash: text('code_hash').notNull(),
    expiresAt: text('expires_at').notNull(),
    used: integer('used').default(0),
    createdAt: text('created_at').default(sql`datetime('now')`),
  },
  (table) => ({
    emailIdx: index('idx_verification_codes_email').on(table.email),
    expiresAtIdx: index('idx_verification_codes_expires_at').on(table.expiresAt),
  }),
);

export const verificationCodesPg = pgTable(
  'verification_codes',
  {
    id: pgText('id').primaryKey(),
    email: pgText('email').notNull(),
    codeHash: pgText('code_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    used: pgInteger('used').default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    emailIdx: pgIndex('idx_verification_codes_email').on(table.email),
    expiresAtIdx: pgIndex('idx_verification_codes_expires_at').on(table.expiresAt),
  }),
);

export const passwordResetRequestsSqlite = sqliteTable(
  'password_reset_requests',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    status: text('status').notNull().default('pending'),
    adminId: text('admin_id'),
    adminNote: text('admin_note'),
    createdAt: text('created_at').default(sql`datetime('now')`),
    resolvedAt: text('resolved_at'),
  },
  (table) => ({
    statusIdx: index('idx_password_reset_requests_status').on(table.status),
  }),
);

export const passwordResetRequestsPg = pgTable(
  'password_reset_requests',
  {
    id: pgText('id').primaryKey(),
    email: pgText('email').notNull(),
    status: pgText('status').notNull().default('pending'),
    adminId: pgText('admin_id'),
    adminNote: pgText('admin_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (table) => ({
    statusIdx: pgIndex('idx_password_reset_requests_status').on(table.status),
  }),
);

export const componentRegistryItemsSqlite = sqliteTable(
  'component_registry_items',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').unique().notNull(),
    category: text('category').notNull().default('general'),
    description: text('description'),
    migrationStatus: text('migration_status').notNull().default('legacy'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: text('created_at').default(sql`datetime('now')`),
    updatedAt: text('updated_at').default(sql`datetime('now')`),
  },
  (table) => ({
    categoryIdx: index('idx_component_registry_items_category').on(table.category),
    migrationStatusIdx: index('idx_component_registry_items_migration_status').on(
      table.migrationStatus,
    ),
  }),
);

export const componentRegistryItemsPg = pgTable(
  'component_registry_items',
  {
    id: pgText('id').primaryKey(),
    name: pgText('name').notNull(),
    slug: pgText('slug').unique().notNull(),
    category: pgText('category').notNull().default('general'),
    description: pgText('description'),
    migrationStatus: pgText('migration_status').notNull().default('legacy'),
    sortOrder: pgInteger('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    categoryIdx: pgIndex('idx_component_registry_items_category').on(table.category),
    migrationStatusIdx: pgIndex('idx_component_registry_items_migration_status').on(
      table.migrationStatus,
    ),
  }),
);

export const componentRegistryVariantsSqlite = sqliteTable(
  'component_registry_variants',
  {
    id: text('id').primaryKey(),
    itemId: text('item_id').notNull(),
    size: text('size').notNull(),
    color: text('color').notNull(),
    state: text('state').notNull(),
    isEnabled: integer('is_enabled').notNull().default(1),
  },
  (table) => ({
    itemIdIdx: index('idx_component_registry_variants_item_id').on(table.itemId),
    // UNIQUE(item_id, size, color, state) — 防止变体重复
    variantUniqueIdx: uniqueIndex('idx_component_registry_variants_unique').on(
      table.itemId,
      table.size,
      table.color,
      table.state,
    ),
  }),
);

export const componentRegistryVariantsPg = pgTable(
  'component_registry_variants',
  {
    id: pgText('id').primaryKey(),
    itemId: pgText('item_id').notNull(),
    size: pgText('size').notNull(),
    color: pgText('color').notNull(),
    state: pgText('state').notNull(),
    isEnabled: pgInteger('is_enabled').notNull().default(1),
  },
  (table) => ({
    itemIdIdx: pgIndex('idx_component_registry_variants_item_id').on(table.itemId),
    variantUniqueIdx: pgUniqueIndex('idx_component_registry_variants_unique').on(
      table.itemId,
      table.size,
      table.color,
      table.state,
    ),
  }),
);

// guides 与 items 为 1:1 关系（itemId.unique()）
export const componentRegistryGuidesSqlite = sqliteTable(
  'component_registry_guides',
  {
    id: text('id').primaryKey(),
    itemId: text('item_id').notNull().unique(),
    useCases: text('use_cases').notNull().default('[]'),
    antiPatterns: text('anti_patterns').notNull().default('[]'),
    updatedAt: text('updated_at').default(sql`datetime('now')`),
  },
  (table) => ({
    itemIdIdx: index('idx_component_registry_guides_item_id').on(table.itemId),
  }),
);

export const componentRegistryGuidesPg = pgTable(
  'component_registry_guides',
  {
    id: pgText('id').primaryKey(),
    itemId: pgText('item_id').notNull().unique(),
    useCases: pgText('use_cases').notNull().default('[]'),
    antiPatterns: pgText('anti_patterns').notNull().default('[]'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    itemIdIdx: pgIndex('idx_component_registry_guides_item_id').on(table.itemId),
  }),
);

export const resourcesSqlite = sqliteTable(
  'resources',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    url: text('url').notNull(),
    description: text('description'),
    resourceType: text('resource_type').notNull().default('article'),
    techTags: text('tech_tags'),
    status: text('status').notNull().default('draft'),
    submittedBy: text('submitted_by').notNull(),
    reviewedBy: text('reviewed_by'),
    reviewNote: text('review_note'),
    fileUrl: text('file_url'),
    viewCount: integer('view_count').notNull().default(0),
    likeCount: integer('like_count').notNull().default(0),
    createdAt: text('created_at').default(sql`datetime('now')`),
    updatedAt: text('updated_at').default(sql`datetime('now')`),
  },
  (table) => ({
    statusIdx: index('idx_resources_status').on(table.status),
    resourceTypeIdx: index('idx_resources_resource_type').on(table.resourceType),
    submittedByIdx: index('idx_resources_submitted_by').on(table.submittedBy),
    createdAtIdx: index('idx_resources_created_at').on(table.createdAt),
  }),
);

export const resourcesPg = pgTable(
  'resources',
  {
    id: pgText('id').primaryKey(),
    title: pgText('title').notNull(),
    url: pgText('url').notNull(),
    description: pgText('description'),
    resourceType: pgText('resource_type').notNull().default('article'),
    techTags: pgText('tech_tags'),
    status: pgText('status').notNull().default('draft'),
    submittedBy: pgText('submitted_by').notNull(),
    reviewedBy: pgText('reviewed_by'),
    reviewNote: pgText('review_note'),
    fileUrl: pgText('file_url'),
    viewCount: pgInteger('view_count').notNull().default(0),
    likeCount: pgInteger('like_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    statusIdx: pgIndex('idx_resources_status').on(table.status),
    resourceTypeIdx: pgIndex('idx_resources_resource_type').on(table.resourceType),
    submittedByIdx: pgIndex('idx_resources_submitted_by').on(table.submittedBy),
    createdAtIdx: pgIndex('idx_resources_created_at').on(table.createdAt),
  }),
);

export const joinApplicationsSqlite = sqliteTable(
  'join_applications',
  {
    id: text('id').primaryKey(),
    applicantName: text('applicant_name').notNull(),
    studentId: text('student_id').notNull(),
    major: text('major').notNull(),
    techTags: text('tech_tags'),
    reason: text('reason').notNull(),
    contactQq: text('contact_qq'),
    contactPhone: text('contact_phone'),
    status: text('status').notNull().default('pending'),
    reviewedBy: text('reviewed_by'),
    reviewNote: text('review_note'),
    createdAt: text('created_at').default(sql`datetime('now')`),
    updatedAt: text('updated_at').default(sql`datetime('now')`),
  },
  (table) => ({
    statusIdx: index('idx_join_applications_status').on(table.status),
    createdAtIdx: index('idx_join_applications_created_at').on(table.createdAt),
  }),
);

export const joinApplicationsPg = pgTable(
  'join_applications',
  {
    id: pgText('id').primaryKey(),
    applicantName: pgText('applicant_name').notNull(),
    studentId: pgText('student_id').notNull(),
    major: pgText('major').notNull(),
    techTags: pgText('tech_tags'),
    reason: pgText('reason').notNull(),
    contactQq: pgText('contact_qq'),
    contactPhone: pgText('contact_phone'),
    status: pgText('status').notNull().default('pending'),
    reviewedBy: pgText('reviewed_by'),
    reviewNote: pgText('review_note'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    statusIdx: pgIndex('idx_join_applications_status').on(table.status),
    createdAtIdx: pgIndex('idx_join_applications_created_at').on(table.createdAt),
  }),
);

export const settingsSqlite = sqliteTable(
  'settings',
  {
    id: text('id').primaryKey(),
    module: text('module').notNull(),
    key: text('key').notNull(),
    value: text('value').notNull(),
    updatedAt: text('updated_at').default(sql`datetime('now')`),
  },
  (table) => ({
    moduleIdx: index('idx_settings_module').on(table.module),
    // UNIQUE(module, key) — 防止配置项重复
    moduleKeyUniqueIdx: uniqueIndex('idx_settings_module_key').on(table.module, table.key),
  }),
);

export const settingsPg = pgTable(
  'settings',
  {
    id: pgText('id').primaryKey(),
    module: pgText('module').notNull(),
    key: pgText('key').notNull(),
    value: pgText('value').notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    moduleIdx: pgIndex('idx_settings_module').on(table.module),
    moduleKeyUniqueIdx: pgUniqueIndex('idx_settings_module_key').on(table.module, table.key),
  }),
);

export interface SystemSchemaSet {
  verificationCodes: typeof verificationCodesSqlite | typeof verificationCodesPg;
  passwordResetRequests:
    | typeof passwordResetRequestsSqlite
    | typeof passwordResetRequestsPg;
  componentRegistryItems:
    | typeof componentRegistryItemsSqlite
    | typeof componentRegistryItemsPg;
  componentRegistryVariants:
    | typeof componentRegistryVariantsSqlite
    | typeof componentRegistryVariantsPg;
  componentRegistryGuides:
    | typeof componentRegistryGuidesSqlite
    | typeof componentRegistryGuidesPg;
  resources: typeof resourcesSqlite | typeof resourcesPg;
  joinApplications: typeof joinApplicationsSqlite | typeof joinApplicationsPg;
  settings: typeof settingsSqlite | typeof settingsPg;
}

export function getSystemSchema(): SystemSchemaSet {
  if (process.env.DATABASE_PROVIDER === 'pg') {
    return {
      verificationCodes: verificationCodesPg,
      passwordResetRequests: passwordResetRequestsPg,
      componentRegistryItems: componentRegistryItemsPg,
      componentRegistryVariants: componentRegistryVariantsPg,
      componentRegistryGuides: componentRegistryGuidesPg,
      resources: resourcesPg,
      joinApplications: joinApplicationsPg,
      settings: settingsPg,
    };
  }
  return {
    verificationCodes: verificationCodesSqlite,
    passwordResetRequests: passwordResetRequestsSqlite,
    componentRegistryItems: componentRegistryItemsSqlite,
    componentRegistryVariants: componentRegistryVariantsSqlite,
    componentRegistryGuides: componentRegistryGuidesSqlite,
    resources: resourcesSqlite,
    joinApplications: joinApplicationsSqlite,
    settings: settingsSqlite,
  };
}
