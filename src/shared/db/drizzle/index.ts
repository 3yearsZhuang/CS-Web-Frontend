/**
 * @file Drizzle schema 聚合 barrel
 *
 * 集中导出所有模块的 Drizzle schema，供 drizzle-kit generate 与 Repository 使用。
 * 各 schema 模块导出 getXxxSchema() 工厂，按 DATABASE_PROVIDER 返回 SQLite 或 PG schema 实例。
 */
export * from './audit.schema';
export * from './user.schema';
export * from './system.schema';
export * from './event.schema';
export * from './community.schema';
export * from './notification.schema';
export * from './exam.schema';
export * from './task.schema';
