/**
 * @file Node.js 运行时专属 instrumentation 逻辑
 *
 * 此文件被 instrumentation.ts 在 NEXT_RUNTIME === 'nodejs' 时动态导入，
 * 确保 Turbopack 不会将其编译到 Edge Runtime，从而避免 process.on() 报错。
 *
 * 对应 O1：全局错误兜底
 *
 * 注（B1 阶段3，2026-08-06）：原「通知事件初始化 initNotificationEvents」已移除。
 * 经核查，前端 appBus 在业务代码中无任何 emit 调用（仅 event-bus.ts 文档示例提及），
 * 该订阅器订阅的事件永远不触发；站内通知已由后端各业务服务自行产生
 * （如 community_service._notify_*、join_service 等）。保留它只会让前端无谓依赖
 * modules/notification/server，故切断此引用。modules/notification/server 将在阶段 5 随
 * server 层整体删除。
 */

import { logger } from '@/shared/logger';

// 全局未处理 rejection / 未捕获异常兜底 — 进入结构化日志
process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'unhandledRejection');
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'uncaughtException');
  // uncaughtException 后进程状态不可预测，交给 Node 默认策略退出（exit code 1）
  // 不在此处 process.exit，让 Node 默认行为触发并经上方 logger 记录
});

logger.info('[instrumentation] node runtime initialized');
