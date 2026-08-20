/**
 * @file 任务与便签（合并卡）— 今日任务 + 快捷便签双区共存。
 * - 待办区：wb_tasks 持久化（逾期置顶标红、清空二次确认、清除已完成）
 * - 便签区：wb_notes 持久化；便签可一键「转待办」（追加到今日任务并移除便签）
 * 方案：用户选定「双区共存」——两区各自独立存储（wb_tasks / wb_notes），零数据迁移。
 * 复用：WorkbenchCard 外壳、项目 Input/Button 原语、idx-rail 列表、useLocalStorage。
 */
'use client';

import { useTranslations } from 'next-intl';
import { CheckCircle2, NotebookPen, Plus, Trash2 } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { WorkbenchCard } from '../workbench-card';
import { toDateStr, useClock } from '../hooks/use-clock';
import { useLocalStorage } from '../hooks/use-local-storage';
import type { WorkNote, WorkTask } from '../types';

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
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
    { id: uid('t'), title: '示例：昨天未完成的复习（逾期）', dueDate: yesterday, done: false, createdAt: Date.now() },
    { id: uid('t'), title: '示例：今天要处理的练习题', dueDate: today, done: false, createdAt: Date.now() },
    { id: uid('t'), title: '示例：明天的预习', dueDate: tomorrow, done: true, createdAt: Date.now() },
  ];
}

export default function TasksAndNotes() {
  const t = useTranslations('workbench');
  const { now } = useClock(60_000);
  const [tasks, setTasks] = useLocalStorage<WorkTask[]>('wb_tasks', seedTasks);
  const [notes, setNotes] = useLocalStorage<WorkNote[]>('wb_notes', []);
  const [taskTitle, setTaskTitle] = useState('');
  const [dueDate, setDueDate] = useState(() => toDateStr(new Date()));
  const [noteDraft, setNoteDraft] = useState('');

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

  const addTask = useCallback(() => {
    const trimmed = taskTitle.trim();
    if (!trimmed) return;
    setTasks((prev) => [
      { id: uid('t'), title: trimmed, dueDate: dueDate || today, done: false, createdAt: Date.now() },
      ...prev,
    ]);
    setTaskTitle('');
  }, [taskTitle, dueDate, today, setTasks]);

  const toggleTask = useCallback(
    (id: string) => {
      setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
    },
    [setTasks],
  );

  const removeTask = useCallback(
    (id: string) => {
      setTasks((prev) => prev.filter((task) => task.id !== id));
    },
    [setTasks],
  );

  const clearDoneTasks = useCallback(() => {
    setTasks((prev) => prev.filter((task) => !task.done));
  }, [setTasks]);

  const clearAllTasks = useCallback(() => {
    if (window.confirm(t('confirmClearTasks'))) setTasks([]);
  }, [setTasks, t]);

  const addNote = useCallback(() => {
    const content = noteDraft.trim();
    if (!content) return;
    setNotes((prev) => [{ id: uid('n'), content, updatedAt: Date.now() }, ...prev]);
    setNoteDraft('');
  }, [noteDraft, setNotes]);

  const removeNote = useCallback(
    (id: string) => {
      setNotes((prev) => prev.filter((note) => note.id !== id));
    },
    [setNotes],
  );

  /** 便签转待办：追加到今日任务并移除该便签 */
  const noteToTask = useCallback(
    (note: WorkNote) => {
      setTasks((prev) => [
        { id: uid('t'), title: note.content, dueDate: today, done: false, createdAt: Date.now() },
        ...prev,
      ]);
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
    },
    [setTasks, setNotes, today],
  );

  return (
    <WorkbenchCard
      corner="TSK"
      title={t('tasksAndNotes')}
      actions={
        <>
          <button
            type="button"
            className="text-[12px] text-[var(--muted-foreground)] px-2 py-1 rounded hover:bg-[var(--border)]"
            onClick={clearDoneTasks}
          >
            {t('clearDone')}
          </button>
          <button
            type="button"
            className="text-[12px] text-[var(--destructive)] px-2 py-1 rounded hover:bg-[var(--border)]"
            onClick={clearAllTasks}
          >
            {t('clearAll')}
          </button>
        </>
      }
    >
      {/* ===== 待办区 ===== */}
      <div className="flex items-center justify-between gap-2">
        <h4 className="meta-mono text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-2">
          {t('todayTasks')}
          {overdueCount > 0 && (
            <span className="normal-case text-[var(--destructive)] border border-red-500/40 rounded-full px-2 py-0.5">
              {overdueCount} {t('overdue')}
            </span>
          )}
        </h4>
      </div>
      <div className="flex gap-2">
        <Input
          type="text"
          value={taskTitle}
          placeholder={t('taskPlaceholder')}
          className="flex-1 min-w-0"
          onKeyDown={(e) => {
            if (e.key === 'Enter') addTask();
          }}
          onChange={(e) => setTaskTitle(e.target.value)}
        />
        <Input
          type="date"
          value={dueDate}
          className="w-[140px]"
          onChange={(e) => setDueDate(e.target.value)}
        />
        <Button size="sm" variant="pixel" aria-label={t('addTask')} onClick={addTask}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      {sorted.length === 0 ? (
        <p className="text-[13px] text-[var(--muted-foreground)] py-4 text-center">{t('noTasks')}</p>
      ) : (
        <ul className="idx-rail flex-1 min-h-0 overflow-y-auto">
          {sorted.map((task, i) => {
            const isOverdue = !task.done && task.dueDate < today;
            const isDueToday = !task.done && task.dueDate === today;
            return (
              <li key={task.id}>
                <span className="idx">{String(i + 1).padStart(2, '0')}</span>
                <div className="min-w-0">
                  <div className={`idx-ttl truncate ${task.done ? 'line-through opacity-60' : ''}`}>
                    {task.title}
                  </div>
                  <div className="idx-mt">
                    <span className="k">{task.dueDate}</span>
                    {isOverdue && <span className="text-[var(--destructive)]">{t('overdue')}</span>}
                    {isDueToday && <span>{t('todayTasks')}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" aria-label="toggle" className="idx-arw" onClick={() => toggleTask(task.id)}>
                    {task.done ? '✓' : '→'}
                  </button>
                  <button
                    type="button"
                    aria-label="delete"
                    className="shrink-0 p-1 rounded hover:bg-[var(--border)] text-[var(--muted-foreground)]"
                    onClick={() => removeTask(task.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ===== 便签区 ===== */}
      <div className="border-t border-[var(--border)] pt-4 flex flex-col gap-3 min-h-0">
        <h4 className="meta-mono text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-2">
          <NotebookPen className="w-4 h-4" />
          {t('quickNotes')}
        </h4>
        <div className="flex gap-2">
          <Input
            type="text"
            value={noteDraft}
            placeholder={t('notePlaceholder')}
            className="flex-1 min-w-0"
            onKeyDown={(e) => {
              if (e.key === 'Enter') addNote();
            }}
            onChange={(e) => setNoteDraft(e.target.value)}
          />
          <Button size="sm" variant="pixel" aria-label={t('addTask')} onClick={addNote}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <ul className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-y-auto">
          {notes.length === 0 && (
            <li className="text-[13px] text-[var(--muted-foreground)] py-3 text-center">…</li>
          )}
          {notes.map((note) => (
            <li
              key={note.id}
              className="flex items-center gap-2 px-3 py-2 rounded border border-[var(--border)] text-[13px] text-[var(--muted-foreground)] group"
            >
              <button
                type="button"
                aria-label="to task"
                title={t('noteToTask')}
                className="shrink-0 p-1 rounded hover:bg-[var(--border)] text-[var(--primary)] opacity-50 hover:opacity-100 focus:opacity-100 transition-opacity"
                onClick={() => noteToTask(note)}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
              </button>
              <span className="flex-1 min-w-0 truncate">{note.content}</span>
              <button
                type="button"
                aria-label="delete"
                className="shrink-0 p-1 rounded opacity-50 hover:opacity-100 focus:opacity-100 hover:bg-[var(--border)] transition-opacity"
                onClick={() => removeNote(note.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </WorkbenchCard>
  );
}
