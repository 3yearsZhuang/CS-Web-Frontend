/**
 * @file Markdown 编辑器完整版 — 论坛发主题/回复（工具栏 + 图片上传，基于 MarkdownEditorBase）
 */

'use client';

import { useRef, useState, useCallback } from 'react';
import { MarkdownEditorBase, type MarkdownEditorBaseProps } from './forum-markdown-editor-base';

/** 工具栏按钮配置 */
interface ToolbarButton {
  title: string;
  label: string;
  wrap: [string, string];
}

const TOOLBAR_BUTTONS: ToolbarButton[] = [
  { title: '加粗', label: 'B', wrap: ['**', '**'] },
  { title: '斜体', label: 'I', wrap: ['*', '*'] },
  { title: '删除线', label: 'S', wrap: ['~~', '~~'] },
  { title: '标题', label: 'H', wrap: ['## ', ''] },
  { title: '链接', label: '🔗', wrap: ['[', '](https://)'] },
  { title: '行内代码', label: '</>', wrap: ['`', '`'] },
  { title: '代码块', label: '{ }', wrap: ['\n```\n', '\n```\n'] },
  { title: '引用', label: '❝', wrap: ['\n> ', ''] },
  { title: '列表', label: '•', wrap: ['\n- ', ''] },
  { title: '有序列表', label: '1.', wrap: ['\n1. ', ''] },
];

interface MarkdownEditorProps extends Omit<MarkdownEditorBaseProps, 'rows' | 'textareaClassName'> {
  minHeight?: number;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = '在此输入 Markdown 内容...',
  minHeight = 240,
  className = '',
}: MarkdownEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  /** 在 textarea 选区前后插入包裹文本 */
  const insertWrap = useCallback(
    ([before, after]: [string, string]) => {
      const ta = document.activeElement as HTMLTextAreaElement | null;
      if (!ta || ta.tagName !== 'TEXTAREA') {
        onChange(value + before + after);
        return;
      }
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = value.slice(start, end);
      const newValue =
        value.slice(0, start) + before + selected + after + value.slice(end);
      onChange(newValue);
      requestAnimationFrame(() => {
        ta.focus();
        const newStart = start + before.length;
        const newEnd = newStart + selected.length;
        ta.setSelectionRange(newStart, newEnd);
      });
    },
    [value, onChange],
  );

  /** 处理工具栏按钮点击 */
  const handleToolbar = (btn: ToolbarButton) => {
    insertWrap(btn.wrap);
  };

  /** 处理图片上传 */
  const handleImageUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/community/forum/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '上传失败');
      }
      const ta = document.activeElement as HTMLTextAreaElement | null;
      const insertText = `\n![${file.name}](${data.url})\n`;
      if (ta && ta.tagName === 'TEXTAREA') {
        const start = ta.selectionStart;
        const newValue = value.slice(0, start) + insertText + value.slice(start);
        onChange(newValue);
        requestAnimationFrame(() => {
          ta.focus();
          const newCursor = start + insertText.length;
          ta.setSelectionRange(newCursor, newCursor);
        });
      } else {
        onChange(value + insertText);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  /** 文件选择 */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleImageUpload(file);
    }
    e.target.value = '';
  };

  return (
    <div className={`border border-[var(--border)] bg-[var(--card)] ${className}`}>
      {/* 工具栏 */}
      <div className="flex items-center gap-1 px-2 sm:px-4 py-2 overflow-x-auto border-b border-[var(--border)]">
        {TOOLBAR_BUTTONS.map((btn) => (
          <button
            key={btn.title}
            type="button"
            title={btn.title}
            onClick={() => handleToolbar(btn)}
            className="shrink-0 w-8 h-8 flex items-center justify-center text-[12px] font-mono border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors focus-amber"
          >
            {btn.label}
          </button>
        ))}
        {/* 图片上传按钮 */}
        <button
          type="button"
          title="上传图片"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="shrink-0 w-8 h-8 flex items-center justify-center text-[14px] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors focus-amber disabled:opacity-50"
        >
          {uploading ? '···' : '🖼'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* 编辑/预览区 — 复用基础版 */}
      <MarkdownEditorBase
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={Math.max(6, Math.floor(minHeight / 28))}
      />

      {/* 上传错误提示 */}
      {uploadError && (
        <div className="px-4 py-2 border-t border-[var(--border)] meta-mono text-[12px] text-[var(--destructive)]">
          {uploadError}
        </div>
      )}
    </div>
  );
}
