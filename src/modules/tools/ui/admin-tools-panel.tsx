/**
 * @file 管理员工具集面板 — 资源审核 [01] + 考试管理 [02] + 任务管理 [03]（子视图切换）
 *
 * 三个子视图已分别抽离为独立面板（GENERAL 2.4 按关注点拆分），本文件仅保留切换逻辑。
 */
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ResourceReviewPanel } from './tool-resource-review';
import { ExamManagePanel } from './tool-exam-manage';
import { TaskManagePanel } from './tool-task-manage';
import type { ToolSubView } from './tool-types';

/** 管理员工具集面板（资源审核 + 考试管理 + 任务管理） */
export function AdminToolsPanel() {
  const t = useTranslations('toolsAdmin');
  const [subView, setSubView] = useState<ToolSubView>('resources');

  return (
    <div>
      {/* 子视图切换 */}
      <div className="flex items-center gap-6 mb-6 border-b border-[var(--border)] pb-4">
        <button
          type="button"
          onClick={() => setSubView('resources')}
          className={`focus-amber meta-mono text-[12px] tracking-wider transition-colors ${
            subView === 'resources' ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          {t('tabResources')}
        </button>
        <button
          type="button"
          onClick={() => setSubView('exams')}
          className={`focus-amber meta-mono text-[12px] tracking-wider transition-colors ${
            subView === 'exams' ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          {t('tabExams')}
        </button>
        <button
          type="button"
          onClick={() => setSubView('tasks')}
          className={`focus-amber meta-mono text-[12px] tracking-wider transition-colors ${
            subView === 'tasks' ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          {t('tabTasks')}
        </button>
      </div>

      {subView === 'resources' && <ResourceReviewPanel />}
      {subView === 'exams' && <ExamManagePanel />}
      {subView === 'tasks' && <TaskManagePanel />}
    </div>
  );
}
