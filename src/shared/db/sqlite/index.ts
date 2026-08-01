/**
 * @file schema 模块聚合 barrel 与初始化入口
 *
 * 集中导出各业务模块 schema 初始化函数，由 initSchema 统一编排。server-only（依赖 better-sqlite3）。
 */
import type { Database as DB } from 'better-sqlite3';
import { seedEventsIfEmpty, seedForumCategoriesIfEmpty } from '../seeds';
import { cleanupExpiredData } from '../cleanup';

export { initUserSchema } from './user-schema';
export { initForumSchema } from './forum-schema';
export { initExamSchema } from './exam-schema';
export { initTaskSchema } from './task-schema';
export { initEventSchema } from './event-schema';
export { initBlogSchema } from './blog-schema';
export { initNotificationSchema } from './notification-schema';
export { initSystemSchema } from './system-schema';

import { initUserSchema } from './user-schema';
import { initForumSchema } from './forum-schema';
import { initExamSchema } from './exam-schema';
import { initTaskSchema } from './task-schema';
import { initEventSchema } from './event-schema';
import { initBlogSchema } from './blog-schema';
import { initNotificationSchema } from './notification-schema';
import { initSystemSchema } from './system-schema';

/** 初始化 schema（幂等，CREATE TABLE IF NOT EXISTS），编排建表 → 种子 → 清理 */
export function initSchema(db: DB): void {
  // users 必须最先：几乎所有模块的外键都引用 users(id)
  initUserSchema(db);
  // system 次之：admin_actions / verification_codes 等被 cleanup 与审计依赖
  initSystemSchema(db);
  // event/forum：表为 seedIfEmpty 依赖
  initEventSchema(db);
  initForumSchema(db);
  initExamSchema(db);
  initTaskSchema(db);
  initBlogSchema(db);
  initNotificationSchema(db);

  // 跨模块种子数据（仅首次创建对应表时执行，幂等）
  seedEventsIfEmpty(db);
  seedForumCategoriesIfEmpty(db);

  // 启动时清理过期数据（验证码 + 超时重置申请）
  cleanupExpiredData(db);
}
