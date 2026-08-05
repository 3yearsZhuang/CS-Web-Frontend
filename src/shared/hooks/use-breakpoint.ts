'use client';

/**
 * @file useBreakpoint — 检测当前响应式断点（SSR 安全，默认 large，hydrate 后立即校正）
 *
 * 断点阈值与查询串统一来自 `@/shared/constants/breakpoints`，不在本文件硬编码
 * （GENERAL 6.3.2 禁止硬编码断点）。
 */

import { useEffect, useState } from 'react';
import { BREAKPOINT_QUERIES, type Breakpoint } from '@/shared/constants/breakpoints';

export type { Breakpoint } from '@/shared/constants/breakpoints';

export function useBreakpoint(): Breakpoint {
  const [bp, setBp] = useState<Breakpoint>('large');
  useEffect(() => {
    const mobile = window.matchMedia(BREAKPOINT_QUERIES.mobile);
    const tablet = window.matchMedia(BREAKPOINT_QUERIES.tablet);
    const desktop = window.matchMedia(BREAKPOINT_QUERIES.desktop);
    const update = () => {
      if (mobile.matches) setBp('mobile');
      else if (tablet.matches) setBp('tablet');
      else if (desktop.matches) setBp('desktop');
      else setBp('large');
    };
    update();
    mobile.addEventListener('change', update);
    tablet.addEventListener('change', update);
    desktop.addEventListener('change', update);
    return () => {
      mobile.removeEventListener('change', update);
      tablet.removeEventListener('change', update);
      desktop.removeEventListener('change', update);
    };
  }, []);
  return bp;
}
