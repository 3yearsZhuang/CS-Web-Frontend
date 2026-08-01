/**
 * @file 错误监控封装 — pino 结构化日志 + 可选 Sentry + 错误率监控
 */

import { logger } from '@/shared/logger';
import { maskEmail } from '@/shared/utils/mask';
import { recordError } from '@/shared/utils/error-rate-monitor';

/** Sentry 动态初始化（可选）— SENTRY_DSN 存在时动态 import，不加硬依赖 */
let sentryInitialized = false;
async function ensureSentry(): Promise<void> {
  if (sentryInitialized) return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;
  try {
    // @ts-expect-error - 可选依赖，未安装时类型解析失败但不影响运行时
    const Sentry = await import(/* webpackIgnore: true */ '@sentry/node');
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
    });
    sentryInitialized = true;
    logger.info({ monitoring: 'sentry' }, '[monitoring] Sentry 已接入');
  } catch (err) {
    logger.warn(
      { err, monitoring: 'sentry' },
      '[monitoring] SENTRY_DSN 已配置但 @sentry/node 未安装，仅 pino 日志生效',
    );
    sentryInitialized = true;
  }
}

type Severity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

type PinoLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug';

function toPinoLevel(severity?: Severity): PinoLevel {
  if (severity === 'warning') return 'warn';
  return (severity || 'error') as PinoLevel;
}

interface CaptureContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: { id: string; email?: string };
  level?: Severity;
}

function contextToFields(context?: CaptureContext): Record<string, unknown> {
  if (!context) return {};
  const fields: Record<string, unknown> = {};
  if (context.tags) fields.tags = context.tags;
  if (context.extra) fields.extra = context.extra;
  if (context.user) {
    fields.user = {
      id: context.user.id,
      email: context.user.email ? maskEmail(context.user.email) : undefined,
    };
  }
  return fields;
}

/** 捕获异常 — pino 日志 + Sentry 上报（可选）+ 错误率监控 */
export function captureError(error: unknown, context?: CaptureContext): void {
  const level = toPinoLevel(context?.level);
  logger[level]({ err: error, ...contextToFields(context) }, '[monitoring] 异常捕获');

  recordError(context?.tags?.endpoint);

  if (level === 'fatal' || level === 'error') {
    void ensureSentry().then(() => {
      if (sentryInitialized && process.env.SENTRY_DSN) {
        // @ts-expect-error - 可选依赖，未安装时类型解析失败但不影响运行时
        import(/* webpackIgnore: true */ '@sentry/node').then((Sentry) => {
          Sentry.captureException(error, {
            tags: context?.tags,
            extra: context?.extra,
            user: context?.user
              ? {
                  id: context.user.id,
                  email: context.user.email ? maskEmail(context.user.email) : undefined,
                }
              : undefined,
          });
        }).catch(() => {});
      }
    });
  }
}

/** 捕获消息 — 写入 pino 结构化日志 */
export function captureMessage(message: string, context?: CaptureContext): void {
  const level = toPinoLevel(context?.level);
  logger[level]({ ...contextToFields(context) }, message);
}

/** 同步捕获异常 — 用于不能 await 的场景（如 error boundary） */
export function captureErrorSync(error: unknown, context?: CaptureContext): void {
  captureError(error, context);
}

/** 检查外部监控是否已启用 — SENTRY_DSN 存在即已启用；错误率监控始终启用 */
export function isMonitoringEnabled(): boolean {
  return Boolean(process.env.SENTRY_DSN);
}
