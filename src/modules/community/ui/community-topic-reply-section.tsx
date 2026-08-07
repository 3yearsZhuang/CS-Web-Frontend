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
    <section className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-b border-[var(--border)]">
      <div className="max-w-[1600px] mx-auto w-full">
        <div className="flex flex-col md:flex-row gap-0">
          <div className="w-full md:flex-1 md:pr-8 lg:pr-12">
            {/* 回复排序栏 */}
            <div className="flex items-center justify-between mb-8">
              <h2 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)]">
                {t('replyListTitle')} <span className="text-[var(--primary)]">列表</span>
                <span className="display-serif italic text-[var(--muted-foreground)] text-[clamp(14px,2vw,24px)] ml-3 align-baseline">
                  / Replies
                </span>
              </h2>
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
            <div className="mt-20">
              <h2 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)] mb-10 sm:mb-16">
                {t('yourReplyTitle')}
                <span className="display-serif italic text-[var(--muted-foreground)] text-[clamp(14px,2vw,24px)] ml-3 align-baseline">
                  / Reply
                </span>
              </h2>

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

          {/* 右侧栏占位 — 桌面端与正文区右侧栏对齐 */}
          <div className="hidden md:block w-[240px] lg:w-[280px] flex-shrink-0" aria-hidden />
        </div>
      </div>
    </section>
  );
}
