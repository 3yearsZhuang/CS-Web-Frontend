/**
 * @file 主题回复列表 — 主回复 + 分页 + 楼中楼折叠（复用 ForumReplyItem）
 */
'use client';

import { ForumReplyItem } from './forum-reply-item';
import type {
  CurrentUser,
  ForumReplyDetail,
  NestedRepliesResult,
} from '@/modules/community/types';

interface TopicRepliesProps {
  replies: ForumReplyDetail[];
  replyPage: number;
  replyTotalPages: number;
  currentUser: CurrentUser | null;
  isCurrentUserAdmin: boolean;
  isLoggedIn: boolean;
  nestedRepliesLoader: (parentId: string) => Promise<NestedRepliesResult | null>;
  onReplyLike: (targetType: 'topic' | 'reply', targetId: string) => Promise<void>;
  onReplyToParent: (parentReplyId: string) => void;
  onEditReply: (replyId: string, content: string) => void | Promise<void>;
  onDeleteReply: (replyId: string) => Promise<void>;
  onSetReplyPage: (page: number) => void;
}

export function TopicReplies({
  replies,
  replyPage,
  replyTotalPages,
  currentUser,
  isCurrentUserAdmin,
  isLoggedIn,
  nestedRepliesLoader,
  onReplyLike,
  onReplyToParent,
  onEditReply,
  onDeleteReply,
  onSetReplyPage,
}: TopicRepliesProps) {
  return (
    <div>
      {replies.length === 0 ? (
        <div className="py-12 text-center meta-mono text-[var(--muted-foreground)] border-t border-[var(--border)]">
          暂无回复，来发表第一条吧
        </div>
      ) : (
        <div className="border-t border-[var(--border)]">
          {replies.map((reply) => (
            <ForumReplyItem
              key={reply.id}
              reply={reply}
              currentUserId={currentUser?.id}
              isCurrentUserAdmin={isCurrentUserAdmin}
              isLoggedIn={isLoggedIn}
              nestedRepliesLoader={nestedRepliesLoader}
              onLike={onReplyLike}
              onReply={onReplyToParent}
              onEdit={onEditReply}
              onDelete={onDeleteReply}
            />
          ))}
        </div>
      )}

      {/* 分页 */}
      {replyTotalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-8 mt-8 border-t border-[var(--border)]">
          <button
            onClick={() => onSetReplyPage(Math.max(1, replyPage - 1))}
            disabled={replyPage <= 1}
            className="meta-mono px-3 py-1.5 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors disabled:opacity-30 focus-amber"
          >
            ←
          </button>
          <span className="meta-mono text-[var(--muted-foreground)]">
            {String(replyPage).padStart(2, '0')} / {String(replyTotalPages).padStart(2, '0')}
          </span>
          <button
            onClick={() => onSetReplyPage(Math.min(replyTotalPages, replyPage + 1))}
            disabled={replyPage >= replyTotalPages}
            className="meta-mono px-3 py-1.5 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors disabled:opacity-30 focus-amber"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
