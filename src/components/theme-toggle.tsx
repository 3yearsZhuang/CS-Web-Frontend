/**
 * @file 主题切换按钮 — 明暗主题文字 toggle，sm 顶部栏 / lg 抽屉大号两种变体
 */
'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export interface ThemeToggleProps {
  /** 尺寸变体：'sm' 顶部栏（默认），'lg' 抽屉内大号 */
  size?: 'sm' | 'lg';
}

/** 明暗主题切换按钮 */
export function ThemeToggle({ size = 'sm' }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // mounted 前渲染占位，避免 hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const current = mounted ? resolvedTheme ?? theme : 'dark';
  const isDark = current === 'dark';

  const isLarge = size === 'lg';
  const iconSize = isLarge ? 'w-6 h-6' : 'w-4 h-4';
  const placeholderSize = isLarge ? 'w-6 h-6' : 'w-4 h-4';
  // 顶部栏需 min 44x44 触摸目标
  const containerCls = isLarge
    ? 'flex items-center gap-3 px-4 py-3 min-h-[44px] meta-mono text-[13px] text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors focus-amber'
    : 'group flex items-center justify-center gap-2 px-3 py-2 min-w-[44px] min-h-[44px] meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors focus-amber';
  // 顶部栏 <md 仅图标，md+ 显示文字
  const labelCls = isLarge ? 'inline' : 'hidden md:inline';

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={containerCls}
      aria-label={isDark ? '切换到浅色模式' : '切换到深色模式'}
      title={isDark ? '切换到浅色模式' : '切换到深色模式'}
    >
      {mounted ? (
        isDark ? (
          <Sun className={iconSize} strokeWidth={1.5} />
        ) : (
          <Moon className={iconSize} strokeWidth={1.5} />
        )
      ) : (
        <span className={`${placeholderSize} inline-block`} />
      )}
      <span className={labelCls}>{isDark ? 'LIGHT' : 'DARK'}</span>
    </button>
  );
}
