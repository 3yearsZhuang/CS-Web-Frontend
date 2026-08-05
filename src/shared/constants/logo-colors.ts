/**
 * @file logo-colors — 品牌 logo 调色板常量（集中管理，禁止在组件中散落硬编码色值，GENERAL 6.3.2）
 *
 * 与 globals.css 中的 `--logo-*` 设计令牌对应：
 * - `--logo-blue`: #4070e0（浅色）/ #5080e0（深色）
 * - `--logo-blue-light`: #80a0f0（浅色）/ #90c0f0（深色）
 * - `--logo-blue-pale`: #a0d0f0
 * - `--logo-pink`: #f0b0c0
 * - `--logo-pink-pale`: #f0c0d0
 *
 * 供 Canvas 粒子动画（mobius-ring / page-transition）等运行时读取统一引用。
 */

/** 完整 logo 调色板（粒子主色板，与 --logo-* 令牌一致） */
export const LOGO_PALETTE = [
  '#a0d0f0', // --logo-blue-pale
  '#90d0f0', // --logo-blue-light(深色)
  '#80a0f0', // --logo-blue-light(浅色)
  '#5080e0', // --logo-blue(深色)
  '#4070e0', // --logo-blue(浅色)
  '#f0b0c0', // --logo-pink
  '#f0c0d0', // --logo-pink-pale
] as const;

/** 简化 logo 调色板（page-transition 遮罩装饰用，logo 色的子集） */
export const LOGO_PALETTE_MINI = [
  '#a0d0f0',
  '#80a0f0',
  '#5080e0',
  '#f0b0c0',
  '#f0c0d0',
] as const;
