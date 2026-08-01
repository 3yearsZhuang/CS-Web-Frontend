/**
 * @file Node.js 运行时专属 instrumentation 逻辑
 *
 * 此文件被 instrumentation.ts 在 NEXT_RUNTIME === 'nodejs' 时动态导入，
 * 确保 Turbopack 不会将其编译到 Edge Runtime，从而避免 process.on() 报错。
 *
 * 对应 ADR-013：事件监听器显式初始化
 * 对应 O1：全局错误兜底
 */

import { logger } from '@/shared/logger';
import { initNotificationEvents } from '@/modules/notification/server/notification-events';

// 全局未处理 rejection / 未捕获异常兜底 — 进入结构化日志
process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'unhandledRejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaughtException');
  // uncaughtException 后进程状态不可预测，交给 Node 默认策略退出（exit code 1）
  // 不在此处 process.exit，让 Node 默认行为触发并经上方 logger 记录
});

// 通知事件初始化（幂等）
initNotificationEvents();
logger.info('[instrumentation] notification events initialized');
