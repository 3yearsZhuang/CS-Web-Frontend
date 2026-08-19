/**
 * @file 像素星空 — Canvas 2D 星点闪烁背景层（Kimi 暗夜氛围，叠于 MobiusRing 之下）
 *
 * 约定与 MobiusRing 对齐：
 * - DPR 上限 2 + ResizeObserver 自适应
 * - prefers-reduced-motion：静态绘制一帧，不做闪烁动画
 * - 帧率节流到 ~30fps（闪烁视觉无需满帧，省一半绘制）
 * - 滚出视口（IntersectionObserver）或 document.hidden 时暂停 RAF，回到前台/视口恢复
 * - 星点颜色读取运行时 --foreground 计算值，监听 <html> class 变化以跟随主题切换
 */
'use client';

import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  /** 像素尺寸（1 或 2，整数保持像素感） */
  size: number;
  /** 闪烁相位 */
  phase: number;
  /** 闪烁速度 */
  speed: number;
}

interface StarfieldCanvasProps {
  className?: string;
  /** 每多少平方像素一颗星（默认 9000；越小越密） */
  density?: number;
}

/** 解析 CSS 颜色字符串为 [r,g,b]（支持 #rrggbb 与 rgb/rgba()） */
function parseColor(input: string): [number, number, number] | null {
  const hex = /^#([0-9a-f]{6})$/i.exec(input.trim());
  if (hex) {
    const v = parseInt(hex[1], 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }
  const rgb = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(input);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  return null;
}

/** 像素星空背景层 — 星点正弦闪烁，纯装饰（aria-hidden） */
export function StarfieldCanvas({ className = '', density = 9000 }: StarfieldCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let widthPx = 0;
    let heightPx = 0;
    let stars: Star[] = [];
    /** 星点基色（跟随 --foreground，主题切换时刷新） */
    let baseColor: [number, number, number] = [247, 247, 247];

    const refreshColor = () => {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue('--foreground')
        .trim();
      const parsed = raw ? parseColor(raw) : null;
      if (parsed) baseColor = parsed;
    };
    refreshColor();

    const rebuild = () => {
      const rect = canvas.getBoundingClientRect();
      widthPx = rect.width;
      heightPx = rect.height;
      canvas.width = widthPx * dpr;
      canvas.height = heightPx * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.floor((widthPx * heightPx) / density);
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * widthPx,
        y: Math.random() * heightPx,
        size: Math.random() < 0.85 ? 1 : 2,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 1.2,
      }));
    };
    rebuild();

    const ro = new ResizeObserver(rebuild);
    ro.observe(canvas);

    /** 主题切换（<html> class 变化）时刷新星点颜色并重绘 */
    const mo = new MutationObserver(refreshColor);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    /** 帧率节流：闪烁视觉上无需 60fps，限到 ~30fps 即可省一半绘制 */
    const FRAME_INTERVAL = 1000 / 30;
    let lastDraw = 0;

    const draw = (time: number) => {
      ctx.clearRect(0, 0, widthPx, heightPx);
      const [r, g, b] = baseColor;
      for (const s of stars) {
        const alpha = prefersReducedMotion
          ? 0.5
          : 0.25 + 0.55 * Math.abs(Math.sin((time / 1000) * s.speed + s.phase));
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fillRect(Math.floor(s.x), Math.floor(s.y), s.size, s.size);
      }
    };

    /** 是否应运行 RAF：非 reduced-motion + 在视口内 + 标签页可见 */
    let isVisible = true;
    let isRafRunning = false;

    const render = (time: number) => {
      // 节流：仅在达到帧间隔时才重绘，跳过中间帧（RAF 自身仍按 vsync 走，开销可忽略）
      if (time - lastDraw >= FRAME_INTERVAL) {
        lastDraw = time;
        draw(time);
      }
      animationRef.current = requestAnimationFrame(render);
    };
    const startRaf = () => {
      if (isRafRunning) return;
      isRafRunning = true;
      lastDraw = 0;
      animationRef.current = requestAnimationFrame(render);
    };
    const stopRaf = () => {
      if (!isRafRunning) return;
      isRafRunning = false;
      cancelAnimationFrame(animationRef.current);
    };

    /** 统一根据「可见性 + 标签页可见性」决定启停（reduced-motion 走静态帧） */
    const updateRunning = () => {
      if (prefersReducedMotion) {
        stopRaf();
        if (isVisible) draw(0); // 静态一帧（仅在可见时绘制）
        return;
      }
      if (isVisible && !document.hidden) startRaf();
      else stopRaf();
    };

    if (prefersReducedMotion) {
      draw(0); // 静态一帧
    } else {
      startRaf();
    }

    // 滚出视口时暂停绘制（hero 离开屏幕后无需继续闪烁，避免持续占用主线程）
    const io = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        updateRunning();
      },
      { threshold: 0 },
    );
    io.observe(canvas);

    const handleVisibilityChange = () => updateRunning();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopRaf();
      ro.disconnect();
      mo.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [density]);

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        className="h-full w-full [image-rendering:pixelated]"
        aria-hidden="true"
        style={{ display: 'block' }}
      />
    </div>
  );
}
