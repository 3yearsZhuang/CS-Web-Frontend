/**
 * @file 加载模块 — LoadingOverlay / SectionLoading / Skeleton 系列 / Loading
 */

'use client';

import { Spinner } from './spinner';
import type { SpinnerProps } from './spinner';
import { t } from '@/i18n';

/* ============================================================
 * LoadingOverlay — 全屏加载遮罩（入场/退场动画序列）
 * ============================================================ */
export interface LoadingOverlayProps {
  /** 当前阶段：'enter' | 'hold' | 'exit' */
  phase: 'enter' | 'hold' | 'exit';
  /** 加载文案 */
  label?: string;
  /** 退场动画完成后回调 */
  onExitComplete?: () => void;
}

export function LoadingOverlay({
  phase,
  label = 'LOADING',
  onExitComplete,
}: LoadingOverlayProps) {
  if (phase === 'exit') {
    return (
      <div className="fixed inset-0 z-[9999] bg-[var(--background)] flex items-center justify-center pointer-events-none animate-fade-out">
        <div className="text-center space-y-4 opacity-0 animate-fade-in-out">
          <div className="meta-mono text-[var(--muted-foreground)] text-[11px]">
            [ READY ]
          </div>
          <div className="display-serif text-[clamp(20px,4vw,32px)] text-[var(--muted-foreground)]">
            OK
          </div>
        </div>
        <style jsx>{`
          @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }
          @keyframes fadeInOut {
            0% { opacity: 0; }
            30% { opacity: 1; }
            70% { opacity: 1; }
            100% { opacity: 0; }
          }
          .animate-fade-out {
            animation: fadeOut 0.3s ease forwards;
          }
          .animate-fade-in-out {
            animation: fadeInOut 0.6s ease forwards;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-[var(--background)] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="meta-mono text-[var(--muted-foreground)] text-[11px] animate-pulse">
          [ {label} ]
        </div>
        <div className="display-serif text-[clamp(20px,4vw,32px)] text-[var(--muted-foreground)] animate-pulse">
          {t('common.loadingDefault')}
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-6">
          <span className="inline-block w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-loader-dot [animation-delay:0ms]" />
          <span className="inline-block w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-loader-dot [animation-delay:150ms]" />
          <span className="inline-block w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-loader-dot [animation-delay:300ms]" />
        </div>
        <style jsx>{`
          @keyframes loaderDot {
            0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
            40% { opacity: 1; transform: scale(1); }
          }
          .animate-loader-dot {
            animation: loaderDot 1.2s infinite ease-in-out;
          }
        `}</style>
      </div>
    </div>
  );
}

/* ============================================================
 * SectionLoading — 区域加载指示器（inline）
 * ============================================================ */
export interface SectionLoadingProps {
  /** 加载文案 */
  label?: string;
  /** spinner 尺寸（覆盖默认 w-3 h-3） */
  spinnerClassName?: string;
  /** spinner 变体 */
  spinnerVariant?: SpinnerProps['variant'];
  /** 容器 class */
  className?: string;
}

export function SectionLoading({
  label,
  spinnerClassName,
  spinnerVariant = 'primary',
  className = '',
}: SectionLoadingProps) {
  return (
    <div className={`flex items-center justify-center gap-2.5 py-8 ${className}`}>
      <Spinner variant={spinnerVariant} className={spinnerClassName} />
      {label && (
        <span className="meta-mono text-[11px] text-[var(--muted-foreground)]">
          {label}
        </span>
      )}
    </div>
  );
}

/* ============================================================
 * Skeleton — 骨架屏系列
 * ============================================================ */
/** SkeletonLine 组件 Props */
export interface SkeletonLineProps {
  width?: string;
  className?: string;
}

export function SkeletonLine({ width = 'w-full', className = '' }: SkeletonLineProps) {
  return (
    <div
      className={`h-4 bg-[var(--border)] animate-pulse ${width} ${className}`}
    />
  );
}

/** SkeletonCard 组件 Props */
export interface SkeletonCardProps {
  lines?: number;
  className?: string;
}

export function SkeletonCard({ lines = 3, className = '' }: SkeletonCardProps) {
  return (
    <div className={`border border-[var(--border)] p-5 space-y-3 ${className}`}>
      <SkeletonLine width="w-2/3" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <SkeletonLine key={i} />
      ))}
    </div>
  );
}

/** SkeletonBlock 组件 Props */
export interface SkeletonBlockProps {
  rows?: number;
  className?: string;
}

export function SkeletonBlock({ rows = 3, className = '' }: SkeletonBlockProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonLine key={i} width={i === 0 ? 'w-1/3' : 'w-full'} />
      ))}
    </div>
  );
}

/* ============================================================
 * Loading — 保持向后兼容的简单全屏加载（路由 loading.tsx）
 * ============================================================ */
/** Loading 组件 Props */
export interface LoadingProps {
  label?: string;
}

export function Loading({ label = t('common.loadingDefault') }: LoadingProps) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center space-y-4">
        <div className="meta-mono text-[var(--muted-foreground)] text-[11px] animate-pulse">
          [ LOADING ]
        </div>
        <div className="display-serif text-[clamp(20px,4vw,32px)] text-[var(--muted-foreground)] animate-pulse">
          {label}
        </div>
        <div className="flex items-center justify-center gap-1.5 mt-4">
          <span className="inline-block w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-loader-dot [animation-delay:0ms]" />
          <span className="inline-block w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-loader-dot [animation-delay:150ms]" />
          <span className="inline-block w-1.5 h-1.5 bg-[var(--primary)] rounded-full animate-loader-dot [animation-delay:300ms]" />
        </div>
        <style jsx>{`
          @keyframes loaderDot {
            0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
            40% { opacity: 1; transform: scale(1); }
          }
          .animate-loader-dot {
            animation: loaderDot 1.2s infinite ease-in-out;
          }
        `}</style>
      </div>
    </main>
  );
}
