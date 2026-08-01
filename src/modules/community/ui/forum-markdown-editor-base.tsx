/**
 * @file Markdown 编辑器基础版 — 纯编辑/预览切换，无工具栏（适合模态框内使用）
 */

'use client';

import { useRef, useState, useCallback } from 'react';
import { MarkdownRenderer } from './forum-markdown-renderer';
import { InlineTabs } from '@/components/primitives/inline-tabs';

export interface MarkdownEditorBaseProps {
  /** 当前 Markdown 内容 */
  value: string;
  /** 内容变更回调 */
  onChange: (value: string) => void;
  /** 占位符 */
  placeholder?: string;
  /** textarea 行数（rows 属性），默认 8 */
  rows?: number;
  /** textarea 额外 className */
  textareaClassName?: string;
  /** 容器额外 className */
  className?: string;
}

type Mode = 'edit' | 'preview';

export function MarkdownEditorBase({
  value,
  onChange,
  placeholder = '在此输入 Markdown 内容...',
  rows = 8,
  textareaClassName = '',
  className = '',
}: MarkdownEditorBaseProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [mode, setMode] = useState<Mode>('edit');

  /** 键盘快捷键 — Cmd/Ctrl+B 加粗、Cmd/Ctrl+I 斜体 */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = value.slice(start, end);
      const newValue = value.slice(0, start) + '**' + selected + '**' + value.slice(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(start + 2, end + 2);
      });
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = value.slice(start, end);
      const newValue = value.slice(0, start) + '*' + selected + '*' + value.slice(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(start + 1, end + 1);
      });
    }
  };

  return (
    <div className={`border border-[var(--border)] bg-[var(--card)] ${className}`}>
      {/* 编辑/预览 Tab — 复用 InlineTabs 共享组件 */}
      <div className="flex items-center justify-between px-3 sm:px-4 pt-2 pb-1 border-b border-[var(--border)]">
        <InlineTabs
          options={[
            { value: 'edit', label: 'Edit' },
            { value: 'preview', label: 'Preview' },
          ]}
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          gapClassName="gap-4"
        />
        <div className="meta-mono text-[11px] text-[var(--muted-foreground)]">
          {value.length} chars
        </div>
      </div>

      {/* 编辑区 / 预览区 */}
      {mode === 'edit' ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={rows}
          className={`w-full p-4 bg-transparent text-[16px] leading-[1.7] font-mono text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none resize-y min-h-[200px] ${textareaClassName}`}
        />
      ) : (
        <div className="p-4 sm:p-6 overflow-y-auto" style={{ minHeight: rows * 24 + 40 }}>
          {value.trim() ? (
            <MarkdownRenderer content={value} />
          ) : (
            <div className="meta-mono text-[var(--muted-foreground)] text-[14px]">
              暂无内容可预览
            </div>
          )}
        </div>
      )}
    </div>
  );
}
