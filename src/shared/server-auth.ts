/**
 * @file 服务端认证解析（SSR cookie 注水上游）
 *
 * 在 Server Component（根布局）中读取 HttpOnly JWT cookie（fztbu_access /
 * fztbu_refresh），复用 BFF 的 proxyBackend 向后端取当前用户，
 * 供 SWRConfig fallback 注入，使 SSR 与客户端首帧登录态一致，根除 hydration 不匹配。
 *
 * 仅用于服务端（import 'server-only'）：Server Component 可读 cookie，但无法写回
 * cookie，因此此处即使 proxyBackend 触发 401 静默刷新拿到新令牌，也不在此处落地，
 * 刷新后的令牌由客户端 useAuth 挂载后 revalidate /api/auth/me 完成写回。
 */
import 'server-only';

import { cache } from 'react';
import { cookies } from 'next/headers';
import type { SafeUser } from '@/shared/types';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  proxyBackend,
  toSafeUserFromBackend,
  type BackendUser,
} from '@/shared/backend-client';

/**
 * 解析当前登录用户（服务端）。无任何 JWT cookie 时直接返回 null（未登录）；
 * 后端不可达 / 解析失败时降级为 null，由客户端 SWR 重新拉取，不影响页面渲染。
 *
 * 用 React.cache 包裹，避免同一请求内多个 Server Component 重复打后端。
 */
export const getServerUser = cache(async (): Promise<SafeUser | null> => {
  try {
    const store = await cookies();
    const access = store.get(ACCESS_COOKIE)?.value;
    if (!access) return null;
    const refresh = store.get(REFRESH_COOKIE)?.value;

    // 用合成 Request 携带 JWT cookie，复用 BFF proxyBackend（注入 Authorization、
    // 401 静默刷新一次并重试）。URL 仅占位，proxyBackend 只读 req 的 cookie 头。
    const cookieHeader = [
      `${ACCESS_COOKIE}=${access}`,
      refresh ? `${REFRESH_COOKIE}=${refresh}` : null,
    ]
      .filter((p): p is string => p !== null)
      .join('; ');
    const req = new Request('http://localhost/internal/auth/me', {
      headers: { cookie: cookieHeader },
    });

    const proxy = await proxyBackend(req, { path: '/auth/me' });
    if (proxy.status !== 200 || !proxy.body || typeof proxy.body !== 'object') return null;
    const b = proxy.body as { user?: BackendUser; roles?: string[] };
    if (!b.user) return null;
    return toSafeUserFromBackend(b.user, b.roles);
  } catch {
    // 后端不可达 / 网络抖动：降级未登录，客户端会 revalidate /api/auth/me 自愈
    return null;
  }
});
