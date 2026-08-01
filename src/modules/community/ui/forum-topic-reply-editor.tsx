/**
 * @file 主题回复编辑器 — Markdown 编辑器 + 发布/清空按钮（支持楼中楼）
 */
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components';
import { MarkdownEditor } from './forum-markdown-editor';

interface TopicReplyEditorProps {
  replyContent: string;
  replyParentId: string | null;
  replyError: string | null;
  submittingReply: boolean;
  isLoggedIn: boolean;
  onContentChange: (content: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

export function TopicReplyEditor({
  replyContent,
  replyParentId,
  replyError,
  submittingReply,
  isLoggedIn,
  onContentChange,
  onSubmit,
  onCancel,
}: TopicReplyEditorProps) {
  const router = useRouter();

  if (!isLoggedIn) {
    return (
      <div className="border border-[var(--border)] p-8 sm:p-12 text-center">
        <p className="meta-mono text-[var(--muted-foreground)] mb-6">
          {'// 登录后才能参与讨论'}
        </p>
        <Button onClick={() => router.push('/login')}>
          立即登录 →
        </Button>
      </div>
    );
  }

  return (
    <div className="border-t border-[var(--border)] pt-8">
      {replyParentId && (
        <div className="mb-3 meta-mono text-[var(--primary)]">
          {'// 回复楼中楼 (parent: '}{replyParentId.slice(0, 8)}{'...)'}
          <button
            onClick={onCancel}
            className="ml-3 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            取消
          </button>
        </div>
      )}
      <MarkdownEditor
        value={replyContent}
        onChange={onContentChange}
        placeholder="在此输入你的回复... (支持 Markdown)"
        minHeight={200}
        className="max-sm:!min-h-[150px]"
      />
      {replyError && (
        <div className="mt-3 meta-mono text-[var(--destructive)]">
          {replyError}
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3 mt-4">
        <Button
          type="button"
          onClick={onSubmit}
          disabled={submittingReply || !replyContent.trim()}
          className="w-full sm:w-auto"
        >
          {submittingReply ? 'Posting...' : '发布回复'}
        </Button>
        {replyContent && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submittingReply}
            className="w-full sm:w-auto"
          >
            清空
          </Button>
        )}
      </div>
    </div>
  );
}
