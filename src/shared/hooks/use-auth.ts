'use client';

/**
 * @file use-auth Hook
 */

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
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

/**
 * 轻量认证 hook - 用于判断登录状态
 *
 * 基于 SWR 实现请求去重与缓存：多组件并发使用同一 key '/api/auth/me' 时，
 * SWR 会自动合并为单次请求，避免冗余 fetch；路由变化时通过 mutate 触发重验证，
 * 在保持登录态新鲜的同时不产生重复请求。fetcher 由根布局 SWRConfig 全局提供。
 */
export function useAuth() {
  const pathname = usePathname();
  const isFirstRun = useRef(true);

  const { data, isLoading, mutate } = useSWR<AuthMeResponse>('/api/auth/me', {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: true,
  });

  // 路由变化时触发重验证以刷新登录态（跳过首次挂载，避免与 SWR 挂载请求重复）
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }
    mutate();
  }, [pathname, mutate]);

  const user = data?.user ?? null;
  const loading = isLoading;

  return { user, loading, isLoggedIn: !loading && user !== null };
}
