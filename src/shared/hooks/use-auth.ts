'use client';

/**
 * @file use-auth Hook
 */

import { useEffect, useState, useCallback } from 'react';
import useSWR from 'swr';

/** 认证用户信息（useAuth hook 的返回值类型） */
interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
  role: string;
  avatarUrl: string | null;
  avatarType: string | null;
}

/** /api/auth/me 响应体 */
interface AuthMeResponse {
  user: AuthUser | null;
}

/** 本地会话标记：登录成功写入、登出/401 清除。用于硬加载首帧乐观判定已登录，消除登出闪烁。 */
const SESSION_KEY = 'fztbu_session';

/**
 * /api/auth/me 的私有 fetcher（仅作用于本 hook 的 '/api/auth/me' key，覆盖全局
 * SWRConfig 的兜底逻辑「非 2xx 直接返回 null」）：
 * - 200 → 解析 { user }（user 可能为 null）。
 * - 401 + code UNAUTHORIZED（确无登录态 / 令牌轮换失败）→ 返回 { user: null }，视为已登出。
 * - 401 + code SERVER_ERROR（后端瞬时错误，非令牌失效）→ 抛错，SWR 保留上一帧已登录数据，
 *   不把已登录用户误判为登出（修复「切换几次页面头像掉登录」）。
 */
async function authMeFetcher(url: string): Promise<AuthMeResponse> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { code?: string } | null;
    if (body?.code === 'SERVER_ERROR') {
      throw new Error('auth/me transient server error');
    }
    return { user: null };
  }
  const json = (await res.json().catch(() => null)) as AuthMeResponse | null;
  return json ?? { user: null };
}

/**
 * 轻量认证 hook - 用于判断登录状态
 *
 * 基于 SWR 实现请求去重与缓存：多组件并发使用同一 key '/api/auth/me' 时，
 * SWR 会自动合并为单次请求，避免冗余 fetch。登录态由本 hook 的私有 fetcher 解析：
 * 后端瞬时错误（SERVER_ERROR）不会把已登录用户误判为登出；令牌轮换由 BFF 在收到请求时
 * 按需静默 refresh，前端无需在路由切换时主动重验证，因此本 hook 不再监听路由变化触发 mutate。
 */
export function useAuth() {
  const { data, isLoading, mutate } = useSWR<AuthMeResponse>('/api/auth/me', authMeFetcher, {
    revalidateOnFocus: false,
    // 与全局 SWRConfig 保持一致：不在断网恢复时主动重验证 /api/auth/me。
    // 令牌轮换由 BFF 在收到请求时按需静默 refresh，前端无需主动重验证；
    // 否则 Wi-Fi 重连瞬间若 refresh 偶发失败会把已登录用户误判为登出。
    revalidateOnReconnect: false,
    revalidateIfStale: true,
    // 瞬时错误抛错后不自动重试，避免重试风暴；SWR 会保留上一帧已登录数据。
    shouldRetryOnError: false,
  });

  const user = data?.user ?? null;
  const loading = isLoading;

  // 同步预读会话标记：登录成功写入、登出/401 清除。用于硬加载首帧乐观判定已登录，
  // 消除「刷新即闪一下登出」的残留。注意：服务端渲染 sessionMarker 为 false，客户端首帧
  // 以标记乐观判定，可能与 SSR HTML 存在瞬时差异（仅开发模式 hydration 警告，最终状态一致）。
  const [sessionMarker] = useState<boolean>(
    () => typeof window !== 'undefined' && window.localStorage.getItem(SESSION_KEY) === '1',
  );

  // 数据到达后以真实 user 为准；首拉无缓存（loading）时以本地标记乐观视为已登录，
  // 避免硬刷新瞬间 isLoggedIn 短暂为 false 造成的登出闪烁。
  const isLoggedIn = user !== null || (loading && sessionMarker);

  // 仅在得出明确结论（非加载中）时同步标记，避免加载期间反复写 localStorage。
  useEffect(() => {
    if (loading) return;
    try {
      if (user) window.localStorage.setItem(SESSION_KEY, '1');
      else window.localStorage.removeItem(SESSION_KEY);
    } catch {
      // localStorage 不可用时忽略
    }
  }, [user, loading]);

  /** 登出：调用后端清除 cookie、清除本地会话标记，并立即把 SWR 缓存置为未登录态 */
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // 忽略失败，仍以本地清除为准
    }
    try {
      window.localStorage.removeItem(SESSION_KEY);
    } catch {
      // 忽略
    }
    mutate({ user: null } as AuthMeResponse, { revalidate: false });
  }, [mutate]);

  return { user, loading, isLoggedIn, logout };
}
