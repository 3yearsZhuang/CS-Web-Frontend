/**
 * @file SWR 全局配置提供者
 * 将 SWRConfig 封装为 Client Component，解决 Server Component 无法传递 fetcher 函数的问题。
 */
'use client';

import { useMemo } from 'react';
import { SWRConfig } from 'swr';
import type { ReactNode } from 'react';

/**
 * 全局 SWR 配置 — 模块级常量，避免每次渲染重建配置对象
 * （配置对象引用变化会让 SWRConfig 重新下发上下文并触发全部消费者重渲染）。
 */
const SWR_CONFIG = {
  fetcher: (url: string) => fetch(url).then((res) => (res.ok ? res.json() : null)),
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
} as const;

export function SWRProvider({
  children,
  fallback,
}: {
  children: ReactNode;
  /** SSR 注水：key → 初始缓存（如 { '/api/auth/me': { user } }），使首帧与 SSR 一致，根除 hydration 不匹配 */
  fallback?: Record<string, unknown>;
}) {
  // fallback 由服务端注水传入（每次 RSC 渲染可能换新引用），单独 memo；其余配置保持稳定引用
  const value = useMemo(() => ({ ...SWR_CONFIG, fallback }), [fallback]);

  return <SWRConfig value={value}>{children}</SWRConfig>;
}
