/**
 * @file 结构化日志封装 — pino + requestId 链路追踪
 */

import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

/** 全局 logger 单例（dev: pino-pretty，prod: NDJSON） */
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  base: { service: 'fztbucs' },
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:HH:MM:ss.l',
            ignore: 'service,pid,hostname',
          },
        },
      }
    : {}),
});

export const REQUEST_ID_HEADER = 'x-request-id';

/** 从 Request 中提取 requestId（缺失返回 'unknown'） */
export function getRequestId(req: Request | { headers: Headers | Record<string, string | string[] | undefined> }): string {
  const headers = req instanceof Request ? req.headers : (req.headers as Headers);
  if (headers instanceof Headers) {
    return headers.get(REQUEST_ID_HEADER) || 'unknown';
  }
  const val = (headers as Record<string, string | string[] | undefined>)[REQUEST_ID_HEADER];
  return (typeof val === 'string' ? val : undefined) || 'unknown';
}

/** 创建绑定 requestId 的请求级 logger */
export function createRequestLogger(req: Request): pino.Logger {
  const requestId = getRequestId(req);
  return logger.child({ requestId });
}
