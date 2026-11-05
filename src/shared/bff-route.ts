/**
 * @file BFF 路由工厂（routeHandler）—— 统一代理、认证 Cookie 落地与错误语义
 *
 * 背景：`src/app/api/<模块>/route.ts` 共 160 个手写文件 / 7170 行，其中 149 个各自手抄
 * 「proxy 调用 + authPair/clearAuth 接线 + 错误包装」，响应包络并存三套
 * （`{error}` 58 处、`{ok}` 52 处、裸 body 31 处）。重复带来两类系统性缺陷：
 *
 *   1. **A06 漏写回**（110 个路由）：错误分支只 clearAuthCookies、不 setAuthCookies，
 *      401→刷新成功→业务错误后浏览器仍持旧 refresh，超宽限即触发会话家族撤销。
 *   2. **错误语义漂移**：同一故障在不同路由分别被映射成 401 / 500 / 200 空列表。
 *
 * 本工厂把「代理 → 派生 → 响应」收敛成一条路径，让上述两类问题**在类型层面无处可写**：
 * 调用方只能返回数据（成功）或抛出标记了状态码的错误，Cookie 接线与错误规范化由工厂统一执行。
 *
 * 设计取舍：
 * - 不引入抽象基类/中间件，保持「薄」：一个高阶函数 + 一个错误类型。
 * - 与 `proxyBackend` 同层（src/shared/），不依赖具体业务域，业务翻译函数仍由调用方注入。
 * - 存量路由不强制迁移（见 tools/scripts/check/check-bff-handler.mjs 的冻结增量门禁），
 *   但**新增路由 MUST 使用本工厂**。
 */

import 'server-only';

import { NextResponse } from 'next/server';

import {
  applyAuth,
  normalizeError,
  proxyBackend,
  type ProxyResult,
} from '@/shared/backend-client';

/** 代理选项（与 proxyBackend 的第二参对齐，去掉调用方不应关心的字段） */
export interface BffProxyOptions {
  /** 转发到后端的路径（不含 /api/v1 前缀，如 `/events?page=1`） */
  path: string;
  method?: string;
  jsonBody?: unknown;
  formData?: FormData;
  skipAuth?: boolean;
  headers?: Record<string, string>;
}

/** 处理器上下文：原 request + 已解析的 URL（避免每个路由重复 `new URL(req.url)`） */
export interface BffContext {
  req: Request;
  url: URL;
}

/**
 * 业务错误：处理器内抛出，由工厂转成统一错误响应。
 *
 * 用于「在代理前后做参数校验/权限前置判断」的场景，避免每个路由自己拼 `NextResponse.json`。
 */
export class BffError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'BffError';
  }
}

/** 处理器返回值：直接给数据，或给出完整响应（需要自定义头/流式时用） */
export type BffResult<T> = T | NextResponse;

/**
 * 创建 GET/POST/... 处理器。
 *
 * 典型用法（成功路径）：直接把后端 body 经翻译函数返回，Cookie 与错误由工厂处理：
 *
 * ```ts
 * export const GET = routeHandler({ path: '/announcements' }, async ({ proxy }) =>
 *   asArray(proxy.body).map(toAnnouncement),
 * );
 * ```
 *
 * 需要改写查询参数/请求体时用 `proxy` 回调形式：
 *
 * ```ts
 * export const GET = routeHandler(
 *   ({ url }) => ({ path: `/events?page=${url.searchParams.get('page') ?? 1}` }),
 *   async ({ proxy }) => toEventPage(proxy.body),
 * );
 * ```
 */
export function routeHandler<T>(
  options: BffProxyOptions | ((ctx: BffContext) => BffProxyOptions | Promise<BffProxyOptions>),
  handle: (ctx: BffContext & { proxy: ProxyResult }) => Promise<BffResult<T>> | BffResult<T>,
): (req: Request) => Promise<NextResponse> {
  return async (req: Request) => {
    const ctx: BffContext = { req, url: new URL(req.url) };
    try {
      const opts = typeof options === 'function' ? await options(ctx) : options;
      const proxy = await proxyBackend(req, opts);

      // 失败前置短路：非 2xx 统计一错误响应（含轮换 Cookie 写回），不再进入业务翻译，
      // 避免「后端 500 被业务代码当成空数组渲染成 200 空列表」这类假成功。
      if (proxy.status < 200 || proxy.status >= 300) {
        return errResponse(proxy, '请求失败');
      }

      const result = await handle({ ...ctx, proxy });
      if (result instanceof NextResponse) return applyAuth(result, proxy);
      return applyAuth(NextResponse.json(result), proxy);
    } catch (err) {
      if (err instanceof BffError) {
        return NextResponse.json(
          err.code ? { error: err.message, code: err.code } : { error: err.message },
          { status: err.status },
        );
      }
      // 未预期异常：保持与既有 BFF 一致——500 + 规范化错误体，不泄露堆栈
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

/** 统一错误响应（供需要自定义兜底文案的路由复用） */
export function errResponse(proxy: ProxyResult, fallback: string): NextResponse {
  return applyAuth(
    NextResponse.json(normalizeError(proxy.body, fallback), { status: proxy.status }),
    proxy,
  );
}

/** 取数组（后端裸数组或 {items:[...]} 两种形状都兼容） */
export function asArray(body: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(body)) return body as Array<Record<string, unknown>>;
  if (body && typeof body === 'object') {
    const items = (body as Record<string, unknown>).items;
    if (Array.isArray(items)) return items as Array<Record<string, unknown>>;
  }
  return [];
}

/** 取对象（非对象时兜底空对象） */
export function asObject(body: unknown): Record<string, unknown> {
  return (body ?? {}) as Record<string, unknown>;
}
