/**
 * @file 活动列表服务端预取 — 供 /events 的 RSC 壳首屏直出（消除客户端骨架屏等待）
 *
 * 复用 BFF 的 proxyBackend（server-only）携带当前请求的 JWT cookie 取默认视图数据；
 * 预取失败一律降级为空数组，页面照常由客户端按既有逻辑拉取（不引入新的失败态）。
 */
import 'server-only';

import { cookies } from 'next/headers';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  proxyBackend,
  toEventItem,
} from '@/shared/backend-client';
import type { EventItem } from '@/modules/events/types';

/** 与客户端默认视图一致：无状态筛选、pageSize=100（见 events-client 的 fetchEvents） */
const DEFAULT_PATH = '/events?page=1&page_size=100';

/**
 * 预取默认视图的活动列表（服务端）。
 *
 * 返回空数组即代表「未预取到」，客户端会照常请求并在失败时展示错误态。
 */
export async function prefetchEvents(): Promise<EventItem[]> {
  try {
    const store = await cookies();
    const access = store.get(ACCESS_COOKIE)?.value;
    const refresh = store.get(REFRESH_COOKIE)?.value;
    const cookieHeader = [
      access ? `${ACCESS_COOKIE}=${access}` : null,
      refresh ? `${REFRESH_COOKIE}=${refresh}` : null,
    ]
      .filter((part): part is string => part !== null)
      .join('; ');

    // 合成 Request 仅用于携带 cookie（proxyBackend 只读其 cookie 头），URL 仅占位
    const req = new Request('http://localhost/internal/events', {
      headers: cookieHeader ? { cookie: cookieHeader } : {},
    });
    const proxy = await proxyBackend(req, { path: DEFAULT_PATH });
    if (proxy.status !== 200 || !proxy.body || typeof proxy.body !== 'object') return [];
    const body = proxy.body as { items?: unknown };
    const items = Array.isArray(body.items) ? body.items : [];
    return items.map((item) => toEventItem(item) as unknown as EventItem);
  } catch {
    // 后端不可达 / 网络抖动：交给客户端拉取，不影响页面渲染
    return [];
  }
}
