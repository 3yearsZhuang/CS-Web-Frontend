/**
 * @file 工作台 widget 注册表 — 声明 → 配置 → 注册（§2.6）。
 * 新增模块三步：① 在下方数组声明（id/slot/titleKey）② 组装组件 ③ workbench 按 slot 自动渲染，
 * 布局显隐由用户偏好（localStorage wb_widget_prefs）驱动，无需改骨架。
 */
'use client';

import type { ComponentType } from 'react';
import LlmUsageStats from './widgets/llm-usage-stats';
import ExamCountdown from './widgets/exam-countdown';
import GithubHeatmap from './widgets/github-heatmap';
import GreetingBar from './widgets/greeting-bar';
import { PomodoroPlayer } from './widgets/pomodoro';
import QuickNotes from './widgets/quick-notes';
import TodayTasks from './widgets/today-tasks';

export interface WorkbenchWidget {
  id: string;
  /** i18n 词条 key（workbench namespace，布局设置面板展示用） */
  titleKey: string;
  component: ComponentType;
  /** 网格槽位：full（全宽）/ main（左主列）/ side（右栏） */
  slot: 'full' | 'main' | 'side';
}

/** 声明顺序即默认渲染顺序 */
export const WIDGETS: WorkbenchWidget[] = [
  { id: 'greeting', titleKey: 'wbTitle', component: GreetingBar, slot: 'full' },
  { id: 'today-tasks', titleKey: 'todayTasks', component: TodayTasks, slot: 'main' },
  { id: 'github-heatmap', titleKey: 'examCountdown', component: GithubHeatmap, slot: 'main' },
  { id: 'llm-usage', titleKey: 'examCountdown', component: LlmUsageStats, slot: 'main' },
  { id: 'quick-notes', titleKey: 'quickNotes', component: QuickNotes, slot: 'main' },
  { id: 'pomodoro', titleKey: 'pomodoro', component: PomodoroPlayer, slot: 'side' },
  { id: 'exam-countdown', titleKey: 'examCountdown', component: ExamCountdown, slot: 'side' },
];
