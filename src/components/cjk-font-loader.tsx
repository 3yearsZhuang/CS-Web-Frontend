'use client';

/**
 * @file CJK 字族懒加载 — 把 Noto Sans/Serif SC 的 @font-face 规则移出首屏关键路径
 *
 * 背景（实测）：CJK 两个字族按 unicode-range 分片，首次访问实际下载约 900KB（68% 的首屏字节），
 * 与关键 JS/CSS 争抢带宽，把 hydration 从 ~2s 拖到 ~6s（Slow 4G + 4x CPU 实测）。
 *
 * 方案：@font-face CSS 不再随全局样式静态打包，改为空闲时动态 import（Turbopack 会拆成
 * 独立 CSS chunk，随该动态导入一起注入）。文本先用系统 CJK 字体（PingFang SC / 微软雅黑 / 宋体）
 * 渲染，字体就绪后再 swap —— 与 font-display: swap 的既有呈现一致，只是把字体下载移出关键窗口。
 *
 * 回退：不支持 requestIdleCallback 时用 1.5s 定时器；两个 import 失败静默（视为不使用 webfont）。
 */
import { useEffect } from 'react';

/** 触发字体包加载（动态 import 会连带注入其 @font-face CSS） */
function loadCjkFonts() {
  void import('@fontsource-variable/noto-sans-sc');
  void import('@fontsource-variable/noto-serif-sc');
}

export function CjkFontLoader() {
  useEffect(() => {
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(loadCjkFonts, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(loadCjkFonts, 1500);
    return () => clearTimeout(timer);
  }, []);

  return null;
}
