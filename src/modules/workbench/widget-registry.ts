/**
 * @file 工作台 widget 注册表 — 声明 → 配置 → 注册（§2.6）。
 * 新增模块三步：① 在下方数组声明（id/titleKey/defaultSpan）② 组装组件 ③ workbench 自动渲染。
 * 顺序与跨栏由用户偏好（order）驱动，宽度由 order/sizes 驱动（仅 4/8/12 三档），无需改骨架。
 */
'use client';

import type { ComponentType } from 'react';
import type { WidgetSizeSpan } from './types';
import LlmWidget from './widgets/llm-widget';
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
  /** 默认栅格宽度（lg 下 col-span），仅 4 / 8 / 12 三档；用户可在布局面板覆盖 */
  defaultSpan: WidgetSizeSpan;
}

/** 声明顺序即默认渲染顺序（prefs.order 为空时按此渲染） */
export const WIDGETS: WorkbenchWidget[] = [
  { id: 'greeting', titleKey: 'wbTitle', component: GreetingBar, defaultSpan: 12 },
  { id: 'today-tasks', titleKey: 'todayTasks', component: TodayTasks, defaultSpan: 4 },
  { id: 'github-heatmap', titleKey: 'examCountdown', component: GithubHeatmap, defaultSpan: 4 },
  { id: 'llm-usage', titleKey: 'llmUsageTitle', component: LlmWidget, defaultSpan: 8 },
  { id: 'quick-notes', titleKey: 'quickNotes', component: QuickNotes, defaultSpan: 4 },
  { id: 'pomodoro', titleKey: 'pomodoro', component: PomodoroPlayer, defaultSpan: 4 },
  { id: 'exam-countdown', titleKey: 'examCountdown', component: ExamCountdown, defaultSpan: 4 },
];
