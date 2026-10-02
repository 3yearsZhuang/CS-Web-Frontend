/**
 * @file Markdown 渲染器入口 — 社区主题/回复内容（懒加载包装）
 *
 * 实现体在 ./community-markdown-content.tsx，经 next/dynamic 拆为独立 chunk：
 * react-markdown + remark-gfm + rehype-sanitize + rehype-highlight 及其依赖体积较大，
 * 仅在真正渲染 Markdown 的视图加载，不进入各路由首屏 bundle。
 * 默认保持 SSR（服务端仍渲染 Markdown 正文，保障社区内容 SEO 与首屏可读性）。
 */

'use client';

import dynamic from 'next/dynamic';
import type { MarkdownRendererProps } from './community-markdown-content';

/** Markdown 渲染器 — 懒加载实现体，加载期间以轻量骨架占位（避免布局跳动） */
export const MarkdownRenderer = dynamic<MarkdownRendererProps>(
  () => import('./community-markdown-content').then((m) => m.MarkdownContent),
  {
    loading: () => (
      <div className="my-2 h-5 w-2/3 bg-[var(--muted)] opacity-60" aria-hidden="true" />
    ),
  },
);

export type { MarkdownRendererProps };
