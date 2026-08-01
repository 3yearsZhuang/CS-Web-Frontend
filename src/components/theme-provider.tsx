/**
 * @file 主题 Provider — 基于 next-themes 封装，默认深色，通过 .dark 类切换 CSS 变量
 */
'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ThemeProviderProps } from 'next-themes';

/** 主题提供者 — 管理明暗主题切换，使用 next-themes */
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
