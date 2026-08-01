'use client'
/**
 * @file 滚动指示器组件
 */

import { useRef, useEffect, useState, useCallback } from 'react';

/** ScrollIndicator 组件 Props */
interface ScrollIndicatorProps {
  children: React.ReactNode;
  className?: string;
  gap?: string;
}

/** 横向滚动指示器 — 用于标签/Tab 溢出时可横向滚动的容器 */
export function ScrollIndicator({ children, className = '', gap = 'gap-2' }: ScrollIndicatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      ro.disconnect();
    };
  }, [checkScroll]);

  return (
    <div className={`relative ${className}`}>
      {canScrollLeft && (
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-[var(--background)] to-transparent z-10" />
      )}
      {canScrollRight && (
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[var(--background)] to-transparent z-10" />
      )}
      <div
        ref={containerRef}
        className={`flex overflow-x-auto scrollbar-hide ${gap}`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>
    </div>
  );
}