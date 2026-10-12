/**
 * @file 番茄钟常量与设计令牌映射。
 * 阶段色统一引用 globals.css 的 --phase-* token（U-1 颜色收口），
 * 禁止硬编码色值；自动兼容浅色 / 深色主题。
 */
'use client';

import type { PomodoroPhase, PomodoroSettings } from '../../types';

export const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  roundsBeforeLong: 4,
  focusSound: 'rain',
  breakSound: 'waves',
  longBreakSound: 'fire',
};

/** 阶段 → 阶段色 token 类（用于圆环描边 / 状态徽章；令牌定义见 globals.css --phase-*） */
export const PHASE_COLOR_CLASS: Record<PomodoroPhase, string> = {
  idle: 'text-[var(--muted-foreground)] border-[var(--border)]',
  focus: 'text-[var(--phase-focus)] border-[color-mix(in_srgb,var(--phase-focus)_50%,transparent)]',
  shortBreak: 'text-[var(--phase-break)] border-[color-mix(in_srgb,var(--phase-break)_50%,transparent)]',
  longBreak: 'text-[var(--phase-rest)] border-[color-mix(in_srgb,var(--phase-rest)_50%,transparent)]',
};

/** 阶段 → 圆环 SVG stroke 色（引用 --phase-* token，双主题自适应） */
export const PHASE_RING_STROKE: Record<PomodoroPhase, string> = {
  idle: 'var(--muted-foreground)',
  focus: 'var(--phase-focus)',
  shortBreak: 'var(--phase-break)',
  longBreak: 'var(--phase-rest)',
};

export const DURATION_FIELDS: { key: keyof Pick<PomodoroSettings, 'focusMin' | 'shortBreakMin' | 'longBreakMin' | 'roundsBeforeLong'>; min: number; max: number }[] = [
  { key: 'focusMin', min: 1, max: 120 },
  { key: 'shortBreakMin', min: 1, max: 60 },
  { key: 'longBreakMin', min: 1, max: 120 },
  { key: 'roundsBeforeLong', min: 1, max: 12 },
];

export function fmt(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
