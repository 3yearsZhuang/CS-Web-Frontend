/**
 * @file 番茄钟常量与设计令牌映射。
 * 阶段色统一用 Tailwind 语义色板（与项目 tools 页 emerald/amber 用法一致），
 * 避免散落硬编码色值；自动兼容浅色 / 深色主题。
 */
'use client';

import type { AmbientKind } from '../../lib/ambient-audio';
import type { PomodoroPhase, PomodoroSettings, SoundSource } from '../../types';

export const DEFAULT_SETTINGS: PomodoroSettings = {
  focusMin: 25,
  shortBreakMin: 5,
  longBreakMin: 15,
  roundsBeforeLong: 4,
  focusSound: 'rain',
  breakSound: 'waves',
  longBreakSound: 'fire',
};

/** 阶段 → Tailwind 语义色类（用于圆环描边 / 状态徽章） */
export const PHASE_COLOR_CLASS: Record<PomodoroPhase, string> = {
  idle: 'text-[var(--muted-foreground)] border-[var(--border)]',
  focus: 'text-orange-500 border-orange-500/50',
  shortBreak: 'text-emerald-500 border-emerald-500/50',
  longBreak: 'text-blue-500 border-blue-500/50',
};

/** 阶段 → 圆环 SVG stroke 色（Tailwind 色板十六进制，跟随主题静态色） */
export const PHASE_RING_STROKE: Record<PomodoroPhase, string> = {
  idle: 'var(--muted-foreground)',
  focus: '#f97316', // orange-500
  shortBreak: '#10b981', // emerald-500
  longBreak: '#3b82f6', // blue-500
};

export const AMBIENT_KINDS: { value: SoundSource; labelKey: string; kind?: AmbientKind }[] = [
  { value: 'rain', labelKey: 'soundRain', kind: 'rain' },
  { value: 'waves', labelKey: 'soundWaves', kind: 'waves' },
  { value: 'fire', labelKey: 'soundFire', kind: 'fire' },
  { value: 'white', labelKey: 'soundWhite', kind: 'white' },
  { value: 'silence', labelKey: 'silence' },
];

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
