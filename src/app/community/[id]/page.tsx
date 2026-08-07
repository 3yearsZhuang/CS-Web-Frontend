/**
 * @file 社区内容详情 /community/[id] — 统一详情页（合并原社区主题与社区文章）
 *
 * 数据流：
 *   - 数据加载 → useTopicDetail（post + replies + currentUser + relatedPosts）
 *   - 内容写操作 → useTopicActions（点赞 / 收藏 / 删除）
 *   - 回复写操作 → useReplyActions（点赞 / 编辑 / 删除 / 提交 / 取消 / 楼中楼）
 *   - 页面仅负责编排：内容编辑开关、回复排序、渲染分支
 *   - 视觉分段：[ 00 ] TopicHero / TopicContent / [ 01-02 ] TopicReplySection
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { type HeroState } from '@/components/layout/collapsing-hero';
import { SectionLoading } from '@/components';
import { TopicHero } from '@/modules/community/ui/community-topic-hero';
import { TopicContent } from '@/modules/community/ui/community-topic-content';
import { TopicReplySection } from '@/modules/community/ui/community-topic-reply-section';
import { type ReplySortMode } from '@/modules/community/ui/community-reply-sort-bar';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { useTopicDetail } from '@/shared/hooks/use-topic-detail';
import { useTopicActions } from '@/shared/hooks/use-topic-actions';
import { useReplyActions } from '@/shared/hooks/use-reply-actions';
import type { CommunityPostDetail } from '@/modules/community/types';
import { isAdminRole } from '@/shared/types';

export default function CommunityPostDetailPage() {
  const params = useParams<{ id: string }>();
  const postId = params?.id ?? '';
  const t = useTranslations('communityDetail');

  // Hero 进入 1s 后自动收缩并悬浮于页首（动画期间锁定滚动）
  const { collapsed: heroCollapsed, onRevealComplete, onTitleClick } = useCollapsingHero();

  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible: false,
    onRevealComplete,
    onTitleClick,
  };

  // 数据加载（hook 聚合 post + replies + currentUser + relatedPosts）
  const {
    topic,
    setTopic,
    replies,
    setReplies,
    replyPage,
    setReplyPage,
    replyTotalPages,
    replyTotal,
    loading,
    error,
    setError,
    currentUser,
    relatedTopics,
    loadReplies,
    nestedRepliesLoader,
  } = useTopicDetail(postId);

  // 版块 slug（统一路由下从内容自身的 category 派生）
  const categorySlug = topic?.category?.slug ?? '';

  // 内容写操作（点赞 / 收藏 / 删除）
  const { handleTopicLike, handleTopicFavorite, handleDeleteTopic } = useTopicActions({
    topic,
    setTopic,
    setError,
    categorySlug,
  });

  // 回复写操作 + 编辑器状态（点赞 / 编辑 / 删除 / 提交 / 取消 / 楼中楼）
  const {
    replyContent,
    setReplyContent,
    replyParentId,
    submittingReply,
    replyError,
    handleReplyLike,
    handleEditReply,
    handleDeleteReply,
    handleSubmitReply,
    handleCancelReply,
    handleReplyToParent,
  } = useReplyActions({ topic, setReplies, loadReplies, setError });

  // 内容编辑状态（仅页面级 UI 开关）
  const [editingTopic, setEditingTopic] = useState(false);

  // 回复排序
  const [replySort, setReplySort] = useState<ReplySortMode>('newest');

  // 排序后的回复列表
  const sortedReplies = useMemo(() => {
    const sorted = [...replies];
    switch (replySort) {
      case 'newest':
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'oldest':
        sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(a.createdAt).getTime());
        break;
      case 'hottest':
        sorted.sort((a, b) => b.likeCount - a.likeCount);
        break;
    }
    return sorted;
  }, [replies, replySort]);

  // ===== 渲染分支 =====

  if (loading && !topic) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center">
        <SectionLoading label={t('loading')} />
      </main>
    );
  }

  if (error && !topic) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="meta-mono text-[var(--destructive)] mb-4">{error}</div>
          <Link
            href="/community"
            className="meta-mono text-[var(--primary)] underline-grow"
          >
            {t('backToCommunity')}
          </Link>
        </div>
      </main>
    );
  }

  if (!topic) return null;

  const isAuthor = !!currentUser && currentUser.id === topic.authorId;
  const isCurrentUserAdmin = !!currentUser && isAdminRole(currentUser.role);
  const isLoggedIn = !!currentUser;

  return (
    <main className="relative pt-16">
      {/* ============ [ 00 ] Topic Hero — 1s 后自动收缩悬浮（仅标题/元信息） ============ */}
      <TopicHero topic={topic} categorySlug={categorySlug} replyTotal={replyTotal} hero={hero} currentUserId={currentUser?.id} />

      {/* ============ [ 00 ] Topic Content（Hero 延续 — 正文 + 操作栏 + 右侧栏） ============ */}
      <TopicContent
        topic={topic}
        relatedTopics={relatedTopics}
        editingTopic={editingTopic}
        isAuthor={isAuthor}
        isLoggedIn={isLoggedIn}
        isCurrentUserAdmin={isCurrentUserAdmin}
        onCancelEdit={() => setEditingTopic(false)}
        onSavedEdit={(updated: CommunityPostDetail) => {
          setTopic(updated);
          setEditingTopic(false);
        }}
        onStartEdit={async () => setEditingTopic(true)}
        onTopicLike={handleTopicLike}
        onTopicFavorite={handleTopicFavorite}
        onDeleteTopic={handleDeleteTopic}
      />

      {/* ============ [ 01 ] 回复列表 + [ 02 ] 回复编辑器 ============ */}
      <TopicReplySection
        replies={sortedReplies}
        replyPage={replyPage}
        replyTotalPages={replyTotalPages}
        currentUser={currentUser}
        isCurrentUserAdmin={isCurrentUserAdmin}
        isLoggedIn={isLoggedIn}
        replySort={replySort}
        replyContent={replyContent}
        replyParentId={replyParentId}
        replyError={replyError}
        submittingReply={submittingReply}
        nestedRepliesLoader={nestedRepliesLoader}
        onSortChange={setReplySort}
        onContentChange={setReplyContent}
        onSubmit={handleSubmitReply}
        onCancel={handleCancelReply}
        onReplyLike={handleReplyLike}
        onReplyToParent={handleReplyToParent}
        onEditReply={handleEditReply}
        onDeleteReply={handleDeleteReply}
        onSetReplyPage={setReplyPage}
      />
    </main>
  );
}
