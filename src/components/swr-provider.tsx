/**
 * @file SWR 全局配置提供者
 * 将 SWRConfig 封装为 Client Component，解决 Server Component 无法传递 fetcher 函数的问题。
 */
'use client';

import { SWRConfig } from 'swr';
import type { ReactNode } from 'react';

export function SWRProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: (url: string) =>
          fetch(url).then((res) => (res.ok ? res.json() : null)),
        revalidateOnFocus: false,
        revalidateOnReconnect: false,
      }}
    >
      {children}
    </SWRConfig>
  );
}