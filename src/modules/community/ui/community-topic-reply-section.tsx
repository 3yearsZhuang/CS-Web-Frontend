/**
 * @file 帖子详情回复区 — 排序栏 + 回复列表 + 回复编辑器（同 section 上下展示）
 */
'use client';

import { TopicReplies } from '@/modules/community/ui/community-topic-replies';
import { TopicReplyEditor } from '@/modules/community/ui/community-topic-reply-editor';
import { ReplySortBar, type ReplySortMode } from '@/modules/community/ui/community-reply-sort-bar';
import type {
  CurrentUser,
  CommunityCommentDetail,
  NestedCommentsResult,
} from '@/modules/community/types';
import { useTranslations } from 'next-intl';

interface TopicReplySectionProps {
  replies: CommunityCommentDetail[];
  replyPage: number;
  replyTotalPages: number;
  currentUser: CurrentUser | null;
  isCurrentUserAdmin: boolean;
  isLoggedIn: boolean;
  replySort: ReplySortMode;
  replyContent: string;
  replyParentId: string | null;
  replyError: string | null;
  submittingReply: boolean;
  nestedRepliesLoader: (parentId: string) => Promise<NestedCommentsResult | null>;
  onSortChange: (mode: ReplySortMode) => void;
  onContentChange: (content: string) => void;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
  onReplyLike: (targetType: 'topic' | 'reply', targetId: string) => Promise<void>;
  onReplyToParent: (parentReplyId: string) => void;
  onEditReply: (replyId: string, content: string) => void;
  onDeleteReply: (replyId: string) => Promise<void>;
  onSetReplyPage: (page: number) => void;
}

export function TopicReplySection({
  replies,
  replyPage,
  replyTotalPages,
  currentUser,
  isCurrentUserAdmin,
  isLoggedIn,
  replySort,
  replyContent,
  replyParentId,
  replyError,
  submittingReply,
  nestedRepliesLoader,
  onSortChange,
  onContentChange,
  onSubmit,
  onCancel,
  onReplyLike,
  onReplyToParent,
  onEditReply,
  onDeleteReply,
  onSetReplyPage,
}: TopicReplySectionProps) {
  const t = useTranslations('communityCommon');
  return (
    <section className="border-b border-[var(--border)] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
      <div className="mx-auto w-full max-w-[1120px]">
        <div className="w-full max-w-[820px]">
            {/* 回复排序栏 */}
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">{t('replyListTitle')}</h2>
              <ReplySortBar sortMode={replySort} onChange={onSortChange} />
            </div>

            {/* [01] 回复列表 */}
            <TopicReplies
              replies={replies}
              replyPage={replyPage}
              replyTotalPages={replyTotalPages}
              currentUser={currentUser}
              isCurrentUserAdmin={isCurrentUserAdmin}
              isLoggedIn={isLoggedIn}
              nestedRepliesLoader={nestedRepliesLoader}
              onReplyLike={onReplyLike}
              onReplyToParent={onReplyToParent}
              onEditReply={onEditReply}
              onDeleteReply={onDeleteReply}
              onSetReplyPage={onSetReplyPage}
            />

            {/* [02] 回复编辑器 */}
            <div className="mt-12 border-t border-[var(--border)] pt-8">
              <h2 className="mb-6 text-xl font-semibold text-[var(--foreground)]">{t('yourReplyTitle')}</h2>

              <TopicReplyEditor
                replyContent={replyContent}
                replyParentId={replyParentId}
                replyError={replyError}
                submittingReply={submittingReply}
                isLoggedIn={isLoggedIn}
                onContentChange={onContentChange}
                onSubmit={onSubmit}
                onCancel={onCancel}
              />
            </div>
        </div>
      </div>
    </section>
  );
}
