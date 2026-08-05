/**
 * @file breakpoints — 响应式断点常量（集中管理，禁止在组件中硬编码断点数值）
 *
 * 与 Tailwind 默认断点（sm 640 / md 768 / lg 1024 / xl 1280）对齐，
 * 供 `useBreakpoint` 等逻辑统一引用，避免散落魔法数字（GENERAL 6.3.2）。
 */

export type Breakpoint = 'mobile' | 'tablet' | 'desktop' | 'large';

/** 断点下界（px），语义同 Tailwind：低于该值为当前档 */
export const BREAKPOINTS = {
  mobile: 0,
  tablet: 640,
  desktop: 768,
  large: 1024,
} as const;

/** matchMedia 查询串，与 BREAKPOINTS 对应 */
export const BREAKPOINT_QUERIES = {
  mobile: '(max-width: 639px)',
  tablet: '(min-width: 640px) and (max-width: 767px)',
  desktop: '(min-width: 768px) and (max-width: 1023px)',
  large: '(min-width: 1024px)',
} as const;
