/**
 * @file 主题回复列表 — 主回复 + 分页 + 楼中楼折叠（复用 CommunityReplyItem）
 */
'use client';

import { CommunityReplyItem } from './community-reply-item';
import type {
  CurrentUser,
  CommunityCommentDetail,
  NestedCommentsResult,
} from '@/modules/community/types';
import { useTranslations } from 'next-intl';
import { EmptyState, Pagination } from '@/components';

interface TopicRepliesProps {
  replies: CommunityCommentDetail[];
  replyPage: number;
  replyTotalPages: number;
  currentUser: CurrentUser | null;
  isCurrentUserAdmin: boolean;
  isLoggedIn: boolean;
  nestedRepliesLoader: (parentId: string) => Promise<NestedCommentsResult | null>;
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
  const t = useTranslations('communityCommon');
  return (
    <div>
      {replies.length === 0 ? (
        <EmptyState message={t('noRepliesYet')} className="py-12 border-t border-[var(--border)]" />
      ) : (
        <div className="border-t border-[var(--border)]">
          {replies.map((reply) => (
            <CommunityReplyItem
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

      <Pagination page={replyPage} totalPages={replyTotalPages} onPageChange={onSetReplyPage} />
    </div>
  );
}
