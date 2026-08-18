/**
 * @file 工作台共享类型（/tools 工作台）
 */

/** 番茄钟阶段 */
export type PomodoroPhase = 'idle' | 'focus' | 'shortBreak' | 'longBreak';

/** 音源标识：内置环境音 / 静音 / 用户上传音乐（upload:{id}） */
export type SoundSource =
  | 'rain'
  | 'waves'
  | 'fire'
  | 'white'
  | 'silence'
  | `upload:${string}`;

/** 番茄钟配置 */
export interface PomodoroSettings {
  focusMin: number;
  shortBreakMin: number;
  longBreakMin: number;
  roundsBeforeLong: number;
  focusSound: SoundSource;
  breakSound: SoundSource;
  longBreakSound: SoundSource;
}

/** 番茄钟运行时状态（持久化，刷新不丢） */
export interface PomodoroState {
  phase: PomodoroPhase;
  running: boolean;
  endAt: number | null; // 目标结束时间戳（毫秒）
  round: number; // 已完成专注轮数
  finishedAt: number | null; // 当前阶段结束时间戳（已暂停时用于恢复计算）
}

/** 个人待办 */
export interface WorkTask {
  id: string;
  title: string;
  dueDate: string; // YYYY-MM-DD
  done: boolean;
  createdAt: number;
}

/** 便签 */
export interface WorkNote {
  id: string;
  content: string;
  updatedAt: number;
}

/** 上传的音乐文件元数据 */
export interface MediaItem {
  id: string;
  name: string;
  size: number;
  uploadedAt: number;
}

/** 工作台 widget 尺寸档（UI 选）：小 / 中 / 大 */
export type WidgetSize = 'sm' | 'md' | 'lg';

/** 工作台 widget 栅格宽度（lg 下 col-span），仅 4 / 8 / 12 三档 */
export type WidgetSizeSpan = 4 | 8 | 12;
