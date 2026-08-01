/**
 * @file 帖子详情正文区 — 正文/编辑模式 + 操作栏 + 右侧栏（<md 时隐藏右栏）
 */
'use client';

import { RevealItem } from '@/components/effects/motion-primitives';
import { MarkdownRenderer } from '@/modules/community/ui/forum-markdown-renderer';
import { ForumActions } from '@/modules/community/ui/forum-actions';
import { TopicEditForm } from '@/modules/community/ui/forum-topic-edit-form';
import { TopicSidebar } from '@/modules/community/ui/forum-topic-sidebar';
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
    <section className="px-4 sm:px-6 md:px-8 py-12 sm:py-16 border-b border-[var(--border)]">
      <div className="max-w-[1600px] mx-auto w-full">
        <div className="flex flex-col md:flex-row gap-0">
          <div className="w-full md:flex-1 md:pr-8 lg:pr-12">
            {editingTopic ? (
              <TopicEditForm topic={topic} onCancel={onCancelEdit} onSaved={onSavedEdit} />
            ) : (
              <RevealItem>
                <MarkdownRenderer content={topic.contentMarkdown} className="mb-8" />
              </RevealItem>
            )}

            {!editingTopic && (
              <RevealItem>
                <ForumActions
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
                  onLike={onTopicLike}
                  onFavorite={onTopicFavorite}
                  onEdit={onStartEdit}
                  onDelete={onDeleteTopic}
                />
              </RevealItem>
            )}
          </div>

          {/* 右侧栏 — 桌面端显示 */}
          <div className="hidden md:block w-[240px] lg:w-[280px] flex-shrink-0 md:pl-4 md:border-l md:border-[var(--border)]">
            <TopicSidebar topic={topic} relatedTopics={relatedTopics} />
          </div>
        </div>
      </div>
    </section>
  );
}
