/**
 * @file 今日任务聚合 — 个人待办（localStorage）。
 * 排序：逾期(红) > 今天到期 > 明天 > 其他 > 已完成(置底)；清空二次确认。
 * 语义色用项目令牌（--destructive）与 Tailwind 语义色板，主题自适应。
 */
'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle2, Circle, Plus, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { toDateStr, useClock } from '../hooks/use-clock';
import { useLocalStorage } from '../hooks/use-local-storage';
import type { WorkTask } from '../types';

function uid(): string {
  return `t_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 首次进入预置示例（含 1 条逾期） */
function seedTasks(): WorkTask[] {
  const today = toDateStr(new Date());
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  const d = Number(today.slice(8, 10));
  const fmt = (date: Date) => toDateStr(date);
  const yesterday = fmt(new Date(y, m - 1, d - 1));
  const tomorrow = fmt(new Date(y, m - 1, d + 1));
  return [
    { id: uid(), title: '示例：昨天未完成的复习（逾期）', dueDate: yesterday, done: false, createdAt: Date.now() },
    { id: uid(), title: '示例：今天要处理的练习题', dueDate: today, done: false, createdAt: Date.now() },
    { id: uid(), title: '示例：明天的预习', dueDate: tomorrow, done: true, createdAt: Date.now() },
  ];
}

export default function TodayTasks() {
  const t = useTranslations('workbench');
  const { now } = useClock(60_000);
  const [tasks, setTasks] = useLocalStorage<WorkTask[]>('wb_tasks', seedTasks);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(() => toDateStr(new Date()));

  const today = toDateStr(now);
  const tomorrow = toDateStr(new Date(now.getTime() + 86_400_000));

  const sorted = useMemo(() => {
    const rank = (task: WorkTask): number => {
      if (task.done) return 99;
      if (task.dueDate < today) return 0; // 逾期
      if (task.dueDate === today) return 1;
      if (task.dueDate === tomorrow) return 2;
      return 3;
    };
    return [...tasks].sort((a, b) => rank(a) - rank(b) || a.createdAt - b.createdAt);
  }, [tasks, today, tomorrow]);

  const overdueCount = useMemo(
    () => tasks.filter((task) => !task.done && task.dueDate < today).length,
    [tasks, today],
  );

  const add = useCallback(() => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setTasks((prev) => [
      { id: uid(), title: trimmed, dueDate: dueDate || today, done: false, createdAt: Date.now() },
      ...prev,
    ]);
    setTitle('');
  }, [title, dueDate, today, setTasks]);

  const toggle = useCallback(
    (id: string) => {
      setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
    },
    [setTasks],
  );

  const remove = useCallback(
    (id: string) => {
      setTasks((prev) => prev.filter((task) => task.id !== id));
    },
    [setTasks],
  );

  const clearDone = useCallback(() => {
    setTasks((prev) => prev.filter((task) => !task.done));
  }, [setTasks]);

  const clearAll = useCallback(() => {
    if (window.confirm(t('confirmClearTasks'))) setTasks([]);
  }, [setTasks, t]);

  return (
    <div className="card-minimal p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="meta-mono text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
          {t('todayTasks')}
          {overdueCount > 0 && (
            <span className="ml-2 normal-case text-[var(--destructive)] border border-red-500/40 rounded-full px-2 py-0.5">
              {overdueCount} {t('overdue')}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="text-[12px] text-[var(--muted-foreground)] px-2 py-1 rounded hover:bg-[var(--border)]"
            onClick={clearDone}
          >
            {t('clearDone')}
          </button>
          <button
            type="button"
            className="text-[12px] text-[var(--destructive)] px-2 py-1 rounded hover:bg-[var(--border)]"
            onClick={clearAll}
          >
            {t('clearAll')}
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <Input
          type="text"
          value={title}
          placeholder={t('taskPlaceholder')}
          className="flex-1 min-w-0"
          onKeyDown={(e) => {
            if (e.key === 'Enter') add();
          }}
          onChange={(e) => setTitle(e.target.value)}
        />
        <Input
          type="date"
          value={dueDate}
          className="w-[140px]"
          onChange={(e) => setDueDate(e.target.value)}
        />
        <Button size="sm" aria-label={t('addTask')} onClick={add}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <ul className="flex flex-col gap-1.5 max-h-[280px] overflow-y-auto">
        {sorted.length === 0 && (
          <li className="text-[13px] text-[var(--muted-foreground)] py-4 text-center">{t('noTasks')}</li>
        )}
        {sorted.map((task) => {
          const isOverdue = !task.done && task.dueDate < today;
          const isDueToday = !task.done && task.dueDate === today;
          return (
            <li
              key={task.id}
              className={`flex items-center gap-2.5 px-3 py-2 rounded border ${
                isOverdue
                  ? 'border-red-500/40 bg-red-50'
                  : isDueToday
                    ? 'border-amber-500/40 bg-amber-50/60'
                    : 'border-[var(--border)]'
              } ${task.done ? 'opacity-50' : ''}`}
            >
              <button type="button" aria-label="toggle" className="shrink-0" onClick={() => toggle(task.id)}>
                {task.done ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-5 h-5 text-[var(--muted-foreground)]" />
                )}
              </button>
              <span
                className={`flex-1 min-w-0 text-[14px] truncate ${
                  task.done ? 'line-through text-[var(--muted-foreground)]' : 'text-[var(--foreground)]'
                }`}
              >
                {task.title}
              </span>
              <span
                className={`shrink-0 text-[11px] ${
                  isOverdue
                    ? 'text-[var(--destructive)] font-medium'
                    : isDueToday
                      ? 'text-amber-600'
                      : 'text-[var(--muted-foreground)]'
                }`}
              >
                {isOverdue ? `${t('overdue')} · ${task.dueDate}` : task.dueDate}
              </span>
              <button
                type="button"
                aria-label="delete"
                className="shrink-0 p-1 rounded hover:bg-[var(--border)]"
                onClick={() => remove(task.id)}
              >
                <Trash2 className="w-4 h-4 text-[var(--muted-foreground)]" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
