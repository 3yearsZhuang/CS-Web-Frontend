/**
 * @file 帖子详情正文区 — 正文/编辑模式 + 操作栏 + 右侧栏（<md 时隐藏右栏）
 */
'use client';

import { RevealItem } from '@/components/effects/motion-primitives';
import { MarkdownRenderer } from '@/modules/community/ui/community-markdown-renderer';
import { CommunityActions } from '@/modules/community/ui/community-actions';
import { TopicEditForm } from '@/modules/community/ui/community-topic-edit-form';
import { TopicSidebar } from '@/modules/community/ui/community-topic-sidebar';
import type { CommunityPost, CommunityPostDetail } from '@/modules/community/types';

interface TopicContentProps {
  topic: CommunityPostDetail;
  relatedTopics: CommunityPost[];
  editingTopic: boolean;
  isAuthor: boolean;
  isLoggedIn: boolean;
  isCurrentUserAdmin: boolean;
  onCancelEdit: () => void;
  onSavedEdit: (updated: CommunityPostDetail) => void;
  onStartEdit: () => Promise<void>;
  onTopicLike: () => Promise<void>;
  onTopicFavorite: () => Promise<void>;
  onDeleteTopic: () => Promise<void>;
}

export function TopicContent({
  topic,
  relatedTopics,
  editingTopic,
  isAuthor,
  isLoggedIn,
  isCurrentUserAdmin,
  onCancelEdit,
  onSavedEdit,
  onStartEdit,
  onTopicLike,
  onTopicFavorite,
  onDeleteTopic,
}: TopicContentProps) {
  return (
    <section className="border-b border-[var(--border)] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto w-full max-w-[1120px]">
        <div className="flex flex-col gap-10 md:flex-row">
          <div className="w-full min-w-0 md:flex-1">
            {editingTopic ? (
              <TopicEditForm topic={topic} onCancel={onCancelEdit} onSaved={onSavedEdit} />
            ) : (
              <RevealItem>
                <MarkdownRenderer content={topic.contentMarkdown} className="mx-auto mb-10 max-w-[780px]" />
              </RevealItem>
            )}

            {!editingTopic && (
              <RevealItem>
                <CommunityActions
                  targetType="topic"
                  targetId={topic.id}
                  likeCount={topic.likeCount}
                  isLikedByMe={topic.isLikedByMe}
                  isAuthor={isAuthor}
                  isLoggedIn={isLoggedIn}
                  isCurrentUserAdmin={isCurrentUserAdmin}
                  showFavorite
                  favoriteCount={topic.favoriteCount}
                  isFavoritedByMe={topic.isFavoritedByMe}
                  showReport
                  onLike={onTopicLike}
                  onFavorite={onTopicFavorite}
                  onEdit={onStartEdit}
                  onDelete={onDeleteTopic}
                />
              </RevealItem>
            )}
          </div>

          {/* 右侧栏 — 桌面端显示 */}
          <div className="hidden w-[260px] flex-shrink-0 border-l border-[var(--border)] pl-6 lg:block">
            <TopicSidebar topic={topic} relatedTopics={relatedTopics} />
          </div>
        </div>
      </div>
    </section>
  );
}
