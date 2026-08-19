/**
 * @file 工作台 widget 注册表 — 声明 → 配置 → 注册（§2.6）。
 * 新增模块三步：① 在下方数组声明（id/titleKey/defaultSize/sizeOptions）② 组装组件 ③ workbench 自动渲染。
 * 顺序、尺寸由用户偏好（order/sizes）驱动；每卡尺寸限定在 sizeOptions 内，无需改骨架。
 */
'use client';

import type { ComponentType } from 'react';
import type { WidgetSizeKey } from './types';
import LlmWidget from './widgets/llm-widget';
import ExamCountdown from './widgets/exam-countdown';
import GithubHeatmap from './widgets/github-heatmap';
import GreetingBar from './widgets/greeting-bar';
import { PomodoroPlayer } from './widgets/pomodoro';
import TasksAndNotes from './widgets/tasks-and-notes';
import { SchemaWidgetRenderer } from './schema/schema-widget-renderer';

export interface WorkbenchWidget {
  id: string;
  /** i18n 词条 key（workbench namespace，布局设置面板展示用） */
  titleKey: string;
  component: ComponentType;
  /** 默认尺寸规格 key（栅格单元 {w,h}）；用户可在布局面板覆盖 */
  defaultSize: WidgetSizeKey;
  /** 该卡允许切换的尺寸规格集合（限定可搭的"积木块"形状） */
  sizeOptions: WidgetSizeKey[];
}

/** 声明顺序即默认渲染顺序（prefs.order 为空时按此渲染） */
export const WIDGETS: WorkbenchWidget[] = [
  { id: 'greeting', titleKey: 'wbTitle', component: GreetingBar, defaultSize: 'full', sizeOptions: ['full'] },
  {
    id: 'tasks-and-notes',
    titleKey: 'tasksAndNotes',
    component: TasksAndNotes,
    defaultSize: '2x2',
    sizeOptions: ['1x1', '1x2', '2x1', '2x2', '2x3'],
  },
  {
    id: 'github-heatmap',
    titleKey: 'githubHeatmap',
    component: GithubHeatmap,
    defaultSize: '2x1',
    sizeOptions: ['1x1', '1x2', '2x1', '2x2', '2x3'],
  },
  {
    id: 'llm-usage',
    titleKey: 'llmUsageTitle',
    component: LlmWidget,
    defaultSize: '2x2',
    sizeOptions: ['2x2', '2x3', '3x2'],
  },
  {
    id: 'pomodoro',
    titleKey: 'pomodoro',
    component: PomodoroPlayer,
    defaultSize: '1x2',
    sizeOptions: ['1x1', '1x2', '2x1', '2x2'],
  },
  {
    id: 'exam-countdown',
    titleKey: 'examCountdown',
    component: ExamCountdown,
    defaultSize: '1x2',
    sizeOptions: ['1x1', '1x2', '2x1', '2x2'],
  },
  {
    id: 'schema-widget',
    titleKey: 'schemaWidget',
    component: SchemaWidgetRenderer,
    defaultSize: '2x3',
    sizeOptions: ['1x1', '1x2', '2x1', '2x2', '2x3', '3x2', 'full'],
  },
];
