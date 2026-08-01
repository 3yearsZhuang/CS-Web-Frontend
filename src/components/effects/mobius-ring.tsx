/**
 * @file 粒子莫比乌斯环 — Canvas 2D 持续显示 + 鼠标排斥回弹
 */
'use client';

import { useEffect, useRef } from 'react';

/** logo 调色板 — 粉蓝渐变 */
const PALETTE = [
  '#a0d0f0',
  '#90d0f0',
  '#80a0f0',
  '#5080e0',
  '#4070e0',
  '#f0b0c0',
  '#f0c0d0',
];

interface Particle {
  u: number;
  v: number;
  size: number;
  color: string;
  phase: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  targetOffsetX: number;
  targetOffsetY: number;
  targetOffsetZ: number;
}

interface MobiusRingProps {
  className?: string;
  particleCount?: number;
  radius?: number;
  width?: number;
  /** 鼠标排斥半径（屏幕像素，默认 150） */
  repelRadius?: number;
  /** 排斥强度（默认 60，粒子最大推开距离） */
  repelStrength?: number;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * 粒子莫比乌斯环组件 — 持续显示 + 鼠标排斥
 */
export function MobiusRing({
  className = '',
  particleCount = 1500,
  radius = 200,
  width = 50,
  repelRadius = 150,
  repelStrength = 60,
}: MobiusRingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

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

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      widthPx = rect.width;
      heightPx = rect.height;
      canvas.width = widthPx * dpr;
      canvas.height = heightPx * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const rotationX = -0.4;
    const rotationY = 0.2;
    const cosY = Math.cos(rotationY);
    const sinY = Math.sin(rotationY);
    const cosX = Math.cos(rotationX);
    const sinX = Math.sin(rotationX);

    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      const u = (i / particleCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.05;
      const v = (Math.random() * 2 - 1) * width * (0.8 + Math.random() * 0.2);
      particles.push({
        u,
        v,
        size: 0.8 + Math.random() * 1.6,
        color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
        phase: Math.random() * Math.PI * 2,
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0,
        targetOffsetX: 0,
        targetOffsetY: 0,
        targetOffsetZ: 0,
      });
    }

    const getParticlePos = (p: Particle) => {
      const halfU = p.u * 0.5;
      const cosHalfU = Math.cos(halfU);
      const sinHalfU = Math.sin(halfU);
      const r = radius + p.v * cosHalfU;
      return {
        x: r * Math.cos(p.u) + p.offsetX,
        y: r * Math.sin(p.u) + p.offsetY,
        z: p.v * sinHalfU + p.offsetZ,
      };
    };

    const project = (pos: { x: number; y: number; z: number }) => {
      const x1 = pos.x * cosY + pos.z * sinY;
      const z1 = -pos.x * sinY + pos.z * cosY;
      const y1 = pos.y;
      const y2 = y1 * cosX - z1 * sinX;
      const z2 = y1 * sinX + z1 * cosX;
      const x2 = x1;

      const focal = 600;
      const scale = focal / (focal + z2 + radius);
      if (scale <= 0) return null;

      const cx = widthPx / 2;
      const cy = heightPx / 2;
      return {
        x: cx + x2 * scale,
        y: cy + y2 * scale,
        scale,
        z: z2,
      };
    };

    const updateTargetOffsets = () => {
      const mouse = mouseRef.current;
      if (!mouse.active) {
        for (const p of particles) {
          p.targetOffsetX = 0;
          p.targetOffsetY = 0;
          p.targetOffsetZ = 0;
        }
        return;
      }

      for (const p of particles) {
        const pos = getParticlePos(p);
        const projected = project(pos);
        if (!projected) {
          p.targetOffsetX = 0;
          p.targetOffsetY = 0;
          p.targetOffsetZ = 0;
          continue;
        }

        const dx = projected.x - mouse.x;
        const dy = projected.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < repelRadius && dist > 0.01) {
          const force = (1 - dist / repelRadius) * repelStrength;
          const nx = dx / dist;
          const ny = dy / dist;
          p.targetOffsetX = nx * force;
          p.targetOffsetY = ny * force * cosX;
          p.targetOffsetZ = ny * force * sinX;
        } else {
          p.targetOffsetX = 0;
          p.targetOffsetY = 0;
          p.targetOffsetZ = 0;
        }
      }
    };

    let lastTime = performance.now();
    let idleFrames = 0;
    const IDLE_THRESHOLD = 60;
    let isRafRunning = true;

    const isSettled = () => {
      for (const p of particles) {
        if (
          Math.abs(p.offsetX - p.targetOffsetX) > 0.01 ||
          Math.abs(p.offsetY - p.targetOffsetY) > 0.01 ||
          Math.abs(p.offsetZ - p.targetOffsetZ) > 0.01
        ) {
          return false;
        }
      }
      return true;
    };

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 16.67, 2);
      lastTime = time;

      ctx.clearRect(0, 0, widthPx, heightPx);

      updateTargetOffsets();

      const lerpFactor = prefersReducedMotion ? 0.2 : 0.12;
      for (const p of particles) {
        p.offsetX += (p.targetOffsetX - p.offsetX) * lerpFactor * dt;
        p.offsetY += (p.targetOffsetY - p.offsetY) * lerpFactor * dt;
        p.offsetZ += (p.targetOffsetZ - p.offsetZ) * lerpFactor * dt;
      }

      const projected: Array<{
        x: number;
        y: number;
        size: number;
        alpha: number;
        color: string;
        z: number;
      }> = [];

      for (const p of particles) {
        const pos = getParticlePos(p);
        const proj = project(pos);
        if (!proj) continue;

        const depthRatio = (proj.z + radius) / (2 * radius);
        const baseAlpha = 0.4 + (1 - depthRatio) * 0.6;
        const alpha = baseAlpha;

        projected.push({
          x: proj.x,
          y: proj.y,
          size: p.size * proj.scale,
          alpha: Math.max(0, Math.min(1, alpha)),
          color: p.color,
          z: proj.z,
        });
      }

      projected.sort((a, b) => b.z - a.z);

      for (const p of projected) {
        const r = Math.max(0.3, p.size);
        ctx.beginPath();
        ctx.fillStyle = hexToRgba(p.color, p.alpha);
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();

        if (p.size > 1.2 && p.alpha > 0.6) {
          ctx.beginPath();
          ctx.fillStyle = hexToRgba(p.color, p.alpha * 0.15);
          ctx.arc(p.x, p.y, r * 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (!mouseRef.current.active && isSettled()) {
        idleFrames++;
        if (idleFrames >= IDLE_THRESHOLD) {
          isRafRunning = false;
          return;
        }
      } else {
        idleFrames = 0;
      }

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    const resumeRaf = () => {
      if (isRafRunning) return;
      isRafRunning = true;
      idleFrames = 0;
      lastTime = performance.now();
      animationRef.current = requestAnimationFrame(render);
    };

    const handleWindowMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        mouseRef.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          active: true,
        };
        resumeRaf();
      } else {
        mouseRef.current.active = false;
      }
    };
    const handleWindowTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      const touch = e.touches[0];
      if (
        touch.clientX >= rect.left &&
        touch.clientX <= rect.right &&
        touch.clientY >= rect.top &&
        touch.clientY <= rect.bottom
      ) {
        mouseRef.current = {
          x: touch.clientX - rect.left,
          y: touch.clientY - rect.top,
          active: true,
        };
        resumeRaf();
      } else {
        mouseRef.current.active = false;
      }
    };
    const handleTouchEnd = () => {
      mouseRef.current.active = false;
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (isRafRunning) {
          cancelAnimationFrame(animationRef.current);
          isRafRunning = false;
        }
      } else {
        resumeRaf();
      }
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('touchmove', handleWindowTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelAnimationFrame(animationRef.current);
      ro.disconnect();
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('touchmove', handleWindowTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [particleCount, radius, width, repelRadius, repelStrength]);

  return (
    <div className={className}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        aria-hidden="true"
        style={{ display: 'block' }}
      />
    </div>
  );
}
