/**
 * @file Schema 初始化入口 — 向后兼容 re-export shim
 *
 * 实际逻辑按业务模块拆分到 ./schemas/，由 ./schemas/index.ts 的 initSchema 编排。
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
