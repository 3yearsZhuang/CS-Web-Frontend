/**
 * @file 番茄钟模块桶导出（目录即模块，§3.3）。
 * 音乐已独立为 widgets/music 模块，本模块仅保留计时 + 阶段环境音。
 */
'use client';

export { PomodoroPlayer } from './pomodoro-player';
export { usePomodoro } from './use-pomodoro';
export { PHASE_COLOR_CLASS, PHASE_RING_STROKE, fmt } from './constants';
