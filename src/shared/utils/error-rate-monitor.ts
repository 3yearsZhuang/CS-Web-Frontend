/**
 * @file 错误率监控器 — 5 分钟滑动窗口错误率告警
 *
 * 进程内 in-memory 实现，同步 O(1) 更新不阻塞请求路径。
 */

import { logger } from '@/shared/logger';

/** 监控窗口（毫秒）— 5 分钟 */
const WINDOW_MS = 5 * 60 * 1000;

/** 触发告警的最小请求数（避免低流量误报） */
const MIN_SAMPLES_FOR_ALERT = 100;

/** 触发告警的错误率阈值（5%，远超 1% SLO 留缓冲） */
const ERROR_RATE_THRESHOLD = 0.05;

interface WindowState {
  total: number;
  errors: number;
  windowStart: number;
  alerted: boolean;
}

let state: WindowState = {
  total: 0,
  errors: 0,
  windowStart: Date.now(),
  alerted: false,
};

/** 重置滑动窗口 */
function resetWindow(): void {
  state = {
    total: 0,
    errors: 0,
    windowStart: Date.now(),
    alerted: false,
  };
}

/** 检查并滑动窗口（过期则重置） */
function slideIfNeeded(): void {
  if (Date.now() - state.windowStart >= WINDOW_MS) {
    resetWindow();
  }
}

/** 记录一次请求（无论成功失败），同步 O(1) 不阻塞请求 */
export function recordRequest(): void {
  slideIfNeeded();
  state.total++;
}

/** 记录一次错误（5xx 响应或未捕获异常） */
export function recordError(endpoint?: string): void {
  slideIfNeeded();
  state.errors++;

  if (
    !state.alerted &&
    state.total >= MIN_SAMPLES_FOR_ALERT &&
    state.errors / state.total > ERROR_RATE_THRESHOLD
  ) {
    state.alerted = true;
    const errorRate = ((state.errors / state.total) * 100).toFixed(2);
    logger.error(
      {
        alert: 'HIGH_ERROR_RATE',
        windowMs: WINDOW_MS,
        totalRequests: state.total,
        errors: state.errors,
        errorRate: `${errorRate}%`,
        threshold: `${(ERROR_RATE_THRESHOLD * 100)}%`,
        slo: '1% / month',
        endpoint,
      },
      '[alert] 错误率超阈值，SLO 预算正在快速消耗',
    );
  }
}

/** 获取当前窗口状态（供 /api/health/security 查询） */
export function getErrorRateStats(): {
  windowMs: number;
  total: number;
  errors: number;
  errorRate: number;
  threshold: number;
} {
  slideIfNeeded();
  return {
    windowMs: WINDOW_MS,
    total: state.total,
    errors: state.errors,
    errorRate: state.total > 0 ? state.errors / state.total : 0,
    threshold: ERROR_RATE_THRESHOLD,
  };
}
