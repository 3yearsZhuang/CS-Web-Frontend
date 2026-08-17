'use client';

/**
 * @file BootScreen — 首页开机遮罩（全屏终端启动序列）
 *
 * 设计：仿 CRT 开机画面 — 黑/浅粉底 + 主色文字逐行打印系统信息，
 * 打印完成后整屏淡出，随后触发 Hero 入场（onRevealComplete）。
 *
 * 双主题适配：所有颜色走 CSS 变量（--background / --foreground / --primary /
 * --muted-foreground / --border），日间为浅粉底+深蓝，夜间为纯黑+琥珀金，
 * 无需硬编码任何色值，自动跟随 next-themes 的 .dark 类。
 *
 * 无障碍：
 * - 遮罩 role="status" + aria-label 播报启动状态
 * - 逐行打印纯视觉（aria-hidden 内容），实质信息由 aria-label 承担
 * - prefers-reduced-motion 时跳过打印动画，直接触发 onRevealComplete
 */
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import { EASE } from '@/shared/utils/ui-constants';

/** BootScreen Props */
export interface BootScreenProps {
  /** 启动序列完成后触发（Hero 入场信号） */
  onRevealComplete: () => void;
  /** 单行打印间隔（ms） */
  lineInterval?: number;
  /** 打印完成后的停留时间（ms），停留结束后开始淡出 */
  holdMs?: number;
  /** 淡出时长（ms） */
  fadeMs?: number;
}

/** 启动序列行 — [label, 是否命令行] */
const BOOT_LINES = [
  { key: 'bootEst' },
  { key: 'bootMembers' },
  { key: 'bootRing' },
] as const;

export function BootScreen({
  onRevealComplete,
  lineInterval = 380,
  holdMs = 480,
  fadeMs = 850,
}: BootScreenProps) {
  const t = useTranslations('home');
  const [mounted, setMounted] = useState(false);
  const [visibleLines, setVisibleLines] = useState(0);
  const [fading, setFading] = useState(false);
  const firedRef = useRef(false);

  const fireComplete = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    onRevealComplete();
  };

  // 客户端挂载标记 — 避免 motion 库 SSR/Client hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // 启动序列时序：逐行打印 → 停留 → 淡出 → 通知 Hero 入场
  useEffect(() => {
    if (!mounted) return;
    // 减少动态偏好：直接跳过动画
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisibleLines(BOOT_LINES.length + 2); // 命令行 + 全部信息行 + 进入行
      setFading(true);
      fireComplete();
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    // 命令 1 + 信息行 逐行打印
    BOOT_LINES.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleLines(i + 1), 150 + i * lineInterval));
    });
    // 进入命令（最后一行）
    const total = BOOT_LINES.length + 1;
    timers.push(setTimeout(() => setVisibleLines(total), 150 + BOOT_LINES.length * lineInterval));
    // 停留后开始淡出
    const fadeStart = 150 + BOOT_LINES.length * lineInterval + holdMs;
    timers.push(setTimeout(() => setFading(true), fadeStart));
    // 淡出结束后通知 Hero 入场
    timers.push(setTimeout(fireComplete, fadeStart + fadeMs));

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // SSR / Client 首次 render：渲染稳定的占位 div（避免 hydration mismatch）
  // 挂载后再渲染动画版本
  if (!mounted) {
    return (
      <div
        role="status"
        aria-label={t('bootTitle')}
        aria-hidden="true"
        className="fixed inset-0 z-[var(--z-transition)]"
        style={{ background: 'var(--background)' }}
      />
    );
  }

  return (
    <motion.div
      role="status"
      aria-label={t('bootTitle')}
      className="fixed inset-0 z-[var(--z-transition)] flex items-center justify-center px-6 sm:px-10"
      style={{
        background: 'var(--background)',
        color: 'var(--foreground)',
        pointerEvents: fading ? 'none' : 'auto',
      }}
      initial={false}
      animate={{ opacity: fading ? 0 : 1 }}
      transition={{ duration: fadeMs / 1000, ease: EASE }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 极淡扫描线 — CRT 屏幕物理质感 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, currentColor 2px, currentColor 3px)',
        }}
      />
      <div className="relative w-full max-w-[680px] font-mono" aria-hidden="true">
        {/* 标题 */}
        <div
          className="text-[11px] tracking-[0.3em] uppercase text-[var(--muted-foreground)] mb-8"
        >
          {t('bootTitle')}
        </div>

        {/* 命令 1 */}
        <BootLine show={visibleLines >= 1}>
          <span className="text-[var(--primary)] font-bold">$</span>{' '}
          <span className="text-[var(--foreground)]">boot --fztbu-cs</span>{' '}
          {visibleLines === 1 && <Cursor />}
        </BootLine>

        {/* 信息行 */}
        {BOOT_LINES.map((line, i) => (
          <BootLine key={line.key} show={visibleLines >= i + 2}>
            <span className="text-[var(--primary)] font-bold">[ OK ]</span>{' '}
            <span className="text-[var(--muted-foreground)]">{t(line.key)}</span>
          </BootLine>
        ))}

        {/* 进入命令（光标常驻） */}
        <BootLine show={visibleLines >= BOOT_LINES.length + 2}>
          <span className="text-[var(--primary)] font-bold">$</span>{' '}
          <span className="text-[var(--foreground)]">{t('bootEnter')}</span>{' '}
          <Cursor />
        </BootLine>

        {/* 进度线 */}
        <div
          className="mt-10 h-[2px] origin-left bg-[var(--primary)]"
          style={{
            width: '40%',
            transform: fading ? 'scaleX(1)' : 'scaleX(0)',
            transition: `transform ${holdMs / 2}ms ${EASE}`,
          }}
        />
      </div>
    </motion.div>
  );
}

/** 单行启动信息 — 打印完成前隐藏 */
function BootLine({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <div
      className="text-[13px] sm:text-[14px] leading-[2.3] tracking-[0.02em]"
      style={{
        opacity: show ? 1 : 0,
        transition: 'opacity 0.15s ease',
      }}
    >
      {children}
    </div>
  );
}

/** 闪烁光标 — reduced-motion 由 globals.css .boot-screen-cursor 降级为静态 */
function Cursor() {
  return (
    <span
      aria-hidden="true"
      className="boot-screen-cursor inline-block h-[15px] w-[8px] align-[-2px] bg-[var(--primary)]"
      style={{ animation: 'crt-blink 1.1s steps(1) infinite' }}
    />
  );
}
