/**
 * @file 快捷便签 — localStorage 速记，随工作台 JSON 一起导出备份。
 * 输入复用项目 Input，添加按钮复用项目 Button。
 */
'use client';

import { useTranslations } from 'next-intl';
import { NotebookPen, Plus, Trash2 } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { WorkbenchCard } from '../workbench-card';
import { useLocalStorage } from '../hooks/use-local-storage';
import type { WorkNote } from '../types';

function uid(): string {
  return `n_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function QuickNotes() {
  const t = useTranslations('workbench');
  const [notes, setNotes] = useLocalStorage<WorkNote[]>('wb_notes', []);
  const [draft, setDraft] = useState('');

  const add = useCallback(() => {
    const content = draft.trim();
    if (!content) return;
    setNotes((prev) => [
      { id: uid(), content, updatedAt: Date.now() },
      ...prev,
    ]);
    setDraft('');
  }, [draft, setNotes]);

  const remove = useCallback(
    (id: string) => {
      setNotes((prev) => prev.filter((note) => note.id !== id));
    },
    [setNotes],
  );

  return (
    <WorkbenchCard
      corner="NOTE"
      title={
        <>
          <NotebookPen className="w-4 h-4" />
          {t('quickNotes')}
        </>
      }
    >
      <div className="flex gap-2">
        <Input
          type="text"
          value={draft}
          placeholder={t('notePlaceholder')}
          className="flex-1 min-w-0"
          onKeyDown={(e) => {
            if (e.key === 'Enter') add();
          }}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button size="sm" variant="pixel" aria-label={t('addTask')} onClick={add}>
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
            <span className="flex-1 min-w-0 truncate">{note.content}</span>
            <button
              type="button"
              aria-label="delete"
              className="shrink-0 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--border)] transition-opacity"
              onClick={() => remove(note.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </li>
        ))}
      </ul>
    </WorkbenchCard>
  );
}
