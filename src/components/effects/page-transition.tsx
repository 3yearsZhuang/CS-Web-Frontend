'use client';

/**
 * @file 路由级页面切换动画 — 莫比乌斯环进度遮罩，挂载在 layout.tsx 持久化
 */
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'motion/react';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { EASE } from '@/shared/utils/ui-constants';

/** 首次加载动画时长（秒） */
const FIRST_LOAD_DURATION = 1.0;
/** 路由切换动画时长（秒） */
const ROUTE_CHANGE_DURATION = 0.2;

/** 简易莫比乌斯环 Canvas — 用于切换遮罩中心装饰 */
function MiniMobiusRing({ size = 120 }: { size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const PALETTE = ['#a0d0f0', '#80a0f0', '#5080e0', '#f0b0c0', '#f0c0d0'];
    const particleCount = 400;
    const radius = size * 0.32;
    const ringWidth = size * 0.1;
    const rotationX = -0.4;
    const rotationY = 0.2;
    const cosY = Math.cos(rotationY);
    const sinY = Math.sin(rotationY);
    const cosX = Math.cos(rotationX);
    const sinX = Math.sin(rotationX);

    const particles: Array<{
      u: number;
      v: number;
      size: number;
      color: string;
    }> = [];

    for (let i = 0; i < particleCount; i++) {
      const u = (i / particleCount) * Math.PI * 2;
      const v = (Math.random() * 2 - 1) * ringWidth;
      particles.push({
        u,
        v,
        size: 0.6 + Math.random() * 1.2,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      });
    }

    let animationId = 0;
    const startTime = performance.now();

    const render = (time: number) => {
      const elapsed = (time - startTime) * 0.0003;
      ctx.clearRect(0, 0, size, size);

      const projected: Array<{
        x: number;
        y: number;
        size: number;
        alpha: number;
        color: string;
        z: number;
      }> = [];

      for (const p of particles) {
        const u = p.u + elapsed;
        const halfU = u * 0.5;
        const cosHalfU = Math.cos(halfU);
        const sinHalfU = Math.sin(halfU);
        const r = radius + p.v * cosHalfU;
        const x = r * Math.cos(u);
        const y = r * Math.sin(u);
        const z = p.v * sinHalfU;

        const x1 = x * cosY + z * sinY;
        const z1 = -x * sinY + z * cosY;
        const y1 = y;
        const y2 = y1 * cosX - z1 * sinX;
        const z2 = y1 * sinX + z1 * cosX;
        const x2 = x1;

        const focal = 400;
        const scale = focal / (focal + z2 + radius);
        if (scale <= 0) continue;

        const cx = size / 2;
        const cy = size / 2;
        const depthRatio = (z2 + radius) / (2 * radius);
        const alpha = 0.3 + (1 - depthRatio) * 0.7;

        projected.push({
          x: cx + x2 * scale,
          y: cy + y2 * scale,
          size: p.size * scale,
          alpha: Math.max(0, Math.min(1, alpha)),
          color: p.color,
          z: z2,
        });
      }

      projected.sort((a, b) => b.z - a.z);

      for (const p of projected) {
        const r = Math.max(0.2, p.size);
        ctx.beginPath();
        const hex = p.color.replace('#', '');
        const red = parseInt(hex.slice(0, 2), 16);
        const green = parseInt(hex.slice(2, 4), 16);
        const blue = parseInt(hex.slice(4, 6), 16);
        ctx.fillStyle = `rgba(${red}, ${green}, ${blue}, ${p.alpha})`;
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationId);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, display: 'block' }}
      aria-hidden="true"
    />
  );
}

interface PageTransitionProps {
  children: ReactNode;
}

/** 页面过渡动画 — 首次加载完整遮罩，SPA 切换快速过渡 */
export function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const progress = useMotionValue(0);
  const [isTransitioning, setIsTransitioning] = useState(true);
  const isFirstMountRef = useRef(true);
  const prevPathRef = useRef<string | null>(null);
  // 当前动画最大持续时间（秒）— 供 fallback effect 使用
  const maxDurationRef = useRef(FIRST_LOAD_DURATION + 0.5);
  // animate() 返回的控制器 — cleanup 时停止避免动画泄漏
  const controlsRef = useRef<ReturnType<typeof animate> | null>(null);

  // 主 effect：根据 pathname 变化启动动画
  useEffect(() => {
    // 首次挂载（整页加载）— 播放完整动画
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      prevPathRef.current = pathname;
      maxDurationRef.current = FIRST_LOAD_DURATION + 0.5;
      progress.set(0);
      setIsTransitioning(true);

      controlsRef.current = animate(progress, 100, {
        duration: FIRST_LOAD_DURATION,
        ease: EASE,
        onComplete: () => {
          setTimeout(() => setIsTransitioning(false), 80);
        },
      });
      // 不在此 cleanup 中 stop animate：Strict Mode 双执行会 stop 掉首次动画，
      // animate 未卸载时会继续运行并触发 onComplete，fallback effect 兜底关闭遮罩
      return;
    }

    // SPA 路由切换 — 播放 0.2s 加速版
    if (pathname === prevPathRef.current) return;
    prevPathRef.current = pathname;
    maxDurationRef.current = ROUTE_CHANGE_DURATION + 0.5;
    progress.set(0);
    setIsTransitioning(true);

    controlsRef.current = animate(progress, 100, {
      duration: ROUTE_CHANGE_DURATION,
      ease: EASE,
      onComplete: () => {
        setTimeout(() => setIsTransitioning(false), 30);
      },
    });
    return;
  }, [pathname, progress]);

  // 独立的 fallback effect — isTransitioning 为 true 时强制超时关闭遮罩。
  // 独立出来是因为主 effect 在 Strict Mode 下双执行，若 fallback 放主 effect 内，
  // 第一次 cleanup 会清除 fallback，第二次执行因 prevPathRef 已设置而 return，失去兜底。
  useEffect(() => {
    if (!isTransitioning) return;
    const fallback = setTimeout(
      () => setIsTransitioning(false),
      maxDurationRef.current * 1000,
    );
    return () => clearTimeout(fallback);
  }, [isTransitioning]);

  const percentDisplay = useTransform(progress, (v) => `${Math.round(v)}%`);
  const barLeftWidth = useTransform(progress, (v) => `${50 - v * 0.5}%`);
  const barRightWidth = useTransform(progress, (v) => `${50 - v * 0.5}%`);

  return (
    <>
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            key="transition-overlay"
            className="fixed inset-0 z-[70] flex flex-col items-center justify-center pointer-events-none"
            style={{ backgroundColor: 'var(--background)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.02, filter: 'blur(8px)' }}
            transition={{ duration: 0.15, ease: EASE }}
          >
            <div className="relative flex flex-col items-center">
              <div className="relative">
                <MiniMobiusRing size={140} />
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.05, duration: 0.2, ease: EASE }}
                >
                  <motion.span
                    className="display-serif text-[32px] text-[var(--foreground)] tabular-nums"
                    style={{ opacity: 0.9 }}
                  >
                    {percentDisplay}
                  </motion.span>
                </motion.div>
              </div>

              <div className="mt-8 w-[280px] relative h-[2px] flex items-center">
                <motion.div
                  className="absolute left-0 top-0 h-full bg-[var(--primary)] origin-left"
                  style={{ width: barLeftWidth }}
                />
                <motion.div
                  className="absolute right-0 top-0 h-full bg-[var(--primary)] origin-right"
                  style={{ width: barRightWidth }}
                />
                <motion.div
                  className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[var(--primary)]"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.05, duration: 0.2 }}
                />
              </div>

              <motion.div
                className="mt-4 meta-mono text-[var(--muted-foreground)]"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05, duration: 0.2 }}
              >
                LOADING...
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          className="relative"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12, ease: EASE }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </>
  );
}
