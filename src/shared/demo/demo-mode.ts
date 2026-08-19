/**
 * @file 演示模式（Demo Mode）核心 — 后端未连接时的降级演示
 *
 * 背景：BFF 代理架构下，前端所有后端调用经 route.ts → proxyBackend → requestJson
 * 转发到 BACKEND_URL。当后端不可达时，前端可降级到"演示模式"：
 *   - 手动：浏览器写入 cookie fztbu_demo=1（?demo=1 或设置入口触发）
 *   - 自动：请求过程中后端网络失败 → 进程内标记"不可达"（TTL 内视为演示态）
 *
 * 本模块只负责"判定 + mock 路由表查找"，不承载具体业务 mock（见 mock-data/ 各文件）。
 * mock 命中返回的是后端 snake_case 原始形状，route.ts 既有 to* 翻译继续生效。
 *
 * 边界：自动降级状态为进程内内存态（多实例各自判定）。演示为降级体验，无需强一致。
 */

import 'server-only';

import { DEMO_COOKIE } from '@/shared/constants/demo';
import { getCookieValue } from '@/shared/security/security';

/** 后端不可达标记 TTL：标记后 N ms 内视为不可达，避免每个请求都吃满超时 */
export const UNREACHABLE_TTL_MS = 30_000;

/** 演示来源：手动开关 / 自动降级 / 未激活 */
export type DemoSource = 'manual' | 'auto' | null;

/** mock 响应：status + 后端 snake_case 原始形状 body */
export interface DemoMockResponse {
  status: number;
  body: unknown;
}

/** mock 路由条目：路径（支持 :param 模板）+ method + 响应工厂 */
export interface DemoMockRoute {
  /** 匹配路径（如 /auth/login；支持 /events/:id 模板；不含 /api/v1 前缀与 query） */
  path: string;
  /** HTTP 方法（默认 GET） */
  method?: string;
  /** 响应工厂：接收 query 参数、路径参数与请求体，返回 mock 响应 */
  respond: (params: {
    searchParams: URLSearchParams;
    pathParams: Record<string, string>;
    body?: unknown;
  }) => DemoMockResponse;
}

/** 已注册的 mock 路由表（M4 由各 mock-data 模块填充） */
const mockRoutes: DemoMockRoute[] = [];

/** 进程内"后端不可达"时间戳（null = 可达） */
let backendUnreachableAt: number | null = null;

/** 标记后端不可达（自动降级触发；requestJson 网络失败时调用） */
export function markBackendUnreachable(now = Date.now()): void {
  backendUnreachableAt = now;
}

/** 后端不可达标记是否仍有效（TTL 内） */
export function isBackendUnreachable(now = Date.now()): boolean {
  return backendUnreachableAt !== null && now - backendUnreachableAt < UNREACHABLE_TTL_MS;
}

/** 清除不可达标记（健康探测恢复后调用） */
export function clearBackendUnreachable(): void {
  backendUnreachableAt = null;
}

/** 自动降级剩余有效毫秒（0 = 已过期；非不可达态返回 null） */
export function unreachableRemainingMs(now = Date.now()): number | null {
  if (backendUnreachableAt === null) return null;
  const remaining = UNREACHABLE_TTL_MS - (now - backendUnreachableAt);
  return Math.max(0, remaining);
}

/** 手动演示模式：cookie 显式开启 */
export function isManualDemo(req: Request): boolean {
  return getCookieValue(req, DEMO_COOKIE) === '1';
}

/** 演示模式是否激活：手动 cookie 优先，其次自动降级 */
export function isDemoActive(req: Request, now = Date.now()): boolean {
  return isManualDemo(req) || isBackendUnreachable(now);
}

/** 当前演示来源（manual / auto / null，供状态接口与 UI 展示） */
export function demoSource(req: Request, now = Date.now()): DemoSource {
  if (isManualDemo(req)) return 'manual';
  if (isBackendUnreachable(now)) return 'auto';
  return null;
}

/** 路径模板匹配：/events/:id 匹配 /events/5，返回 { id: '5' }；不匹配返回 null */
function matchPath(pattern: string, pathname: string): Record<string, string> | null {
  const pParts = pattern.split('/');
  const ppParts = pathname.split('/');
  if (pParts.length !== ppParts.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < pParts.length; i++) {
    if (pParts[i].startsWith(':')) {
      params[pParts[i].slice(1)] = decodeURIComponent(ppParts[i]);
    } else if (pParts[i] !== ppParts[i]) {
      return null;
    }
  }
  return params;
}

function methodMatches(route: DemoMockRoute, method: string): boolean {
  return (route.method ?? 'GET').toUpperCase() === method;
}

/**
 * 按完整 path（可含 query）+ method 查 mock 路由。
 * 匹配顺序：精确路径优先于 :param 模板（避免 /events/me/registered 被 /events/:id 抢匹配）。
 * 命中返回 { route, searchParams, pathParams }；未命中返回 null → 调用方走真实后端。
 */
export function resolveDemoMock(
  fullPath: string,
  method: string,
): { route: DemoMockRoute; searchParams: URLSearchParams; pathParams: Record<string, string> } | null {
  const m = method.toUpperCase();
  const [pathname, query] = fullPath.split('?');
  const searchParams = new URLSearchParams(query ?? '');

  // 第一轮：精确匹配
  const exact = mockRoutes.find((r) => r.path === pathname && methodMatches(r, m));
  if (exact) return { route: exact, searchParams, pathParams: {} };

  // 第二轮：模板匹配
  for (const route of mockRoutes) {
    if (!methodMatches(route, m)) continue;
    const pathParams = matchPath(route.path, pathname);
    if (pathParams) return { route, searchParams, pathParams };
  }
  return null;
}

/**
 * 注册 mock 路由（幂等：同 path+method 重复注册则覆盖）。
 * 由各 mock-data 模块在 import 时调用。
 */
export function registerDemoMock(route: DemoMockRoute): void {
  const key = `${route.path}::${(route.method ?? 'GET').toUpperCase()}`;
  const idx = mockRoutes.findIndex(
    (r) => `${r.path}::${(r.method ?? 'GET').toUpperCase()}` === key,
  );
  if (idx >= 0) mockRoutes[idx] = route;
  else mockRoutes.push(route);
}
