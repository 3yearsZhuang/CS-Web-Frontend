/**
 * @file shared/db 子模块统一导出
 *
 * 集中导出 schema 初始化、种子数据、迁移与清理工具；单例入口 getDb 在根级 db.ts。
 * server-only（依赖 better-sqlite3）。
 */

export {
  initSchema,
  initUserSchema,
  initForumSchema,
  initExamSchema,
  initTaskSchema,
  initEventSchema,
  initBlogSchema,
  initNotificationSchema,
  initSystemSchema,
} from './schemas/index';
export { seedEventsIfEmpty, seedForumCategoriesIfEmpty } from './seeds';
export { cleanupExpiredData } from './cleanup';
export { runMigrations, getAppliedMigrations } from './migrations';
export { COMPONENT_SEEDS } from './component-seeds';
export type { ComponentSeed } from './component-seeds';
export { SEED_EVENT_PLANS, SEED_EVENT_ARCHIVES } from './seed-events-data';
