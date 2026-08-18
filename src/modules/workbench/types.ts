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

/**
 * 工作台 widget 尺寸规格（手机桌面图标式二维积木）。
 * 以 6 列单元栅格为基准：w = 占列数（1..6），h = 占行数（≥1）。
 * key 用于持久化与 UI 选择；spec 用于渲染 gridColumn / gridRow span。
 */
export type WidgetSizeKey =
  | '1x1'
  | '1x2'
  | '2x1'
  | '2x2'
  | '1x3'
  | '2x3'
  | '3x2'
  | 'full';

export interface WidgetSizeSpec {
  /** 占列数 */
  w: number;
  /** 占行数 */
  h: number;
}

/** 预定义规格表：key → {w,h} 栅格单元数 */
export const WIDGET_SIZE_SPECS: Record<WidgetSizeKey, WidgetSizeSpec> = {
  '1x1': { w: 1, h: 1 },
  '1x2': { w: 1, h: 2 },
  '2x1': { w: 2, h: 1 },
  '2x2': { w: 2, h: 2 },
  '1x3': { w: 1, h: 3 },
  '2x3': { w: 2, h: 3 },
  '3x2': { w: 3, h: 2 },
  full: { w: 6, h: 1 },
};

/** 桌面端栅格总列数（单元数）；窄屏回落见 workbench.tsx 的响应式映射 */
export const GRID_COLS = 6;
