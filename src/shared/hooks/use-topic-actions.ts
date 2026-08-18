'use client';

/**
 * @file useTopicActions — 主题业务回调 hook
 *
 * 封装主题详情页主题相关写操作（点赞/收藏/删除，乐观更新+失败回滚）。
 * 与 useTopicDetail 解耦：数据加载由 useTopicDetail 负责，写操作由本 hook 负责。
 */

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { CommunityPostDetail } from '@/modules/community/types';
import { apiRequest } from '@/shared/hooks/use-api-request';

interface UseTopicActionsParams {
  topic: CommunityPostDetail | null;
  setTopic: (topic: CommunityPostDetail | null) => void;
  setError: (err: string | null) => void;
  categorySlug: string;
}

export interface TopicActions {
  handleTopicLike: () => Promise<void>;
  handleTopicFavorite: () => Promise<void>;
  handleDeleteTopic: () => Promise<void>;
}

export function useTopicActions({
  topic,
  setTopic,
  setError,
  categorySlug,
}: UseTopicActionsParams): TopicActions {
  const router = useRouter();

  const handleTopicLike = useCallback(async () => {
    if (!topic) return;
    const wasLiked = topic.isLikedByMe;
    setTopic({
      ...topic,
      isLikedByMe: !wasLiked,
      likeCount: topic.likeCount + (wasLiked ? -1 : 1),
    });
    try {
      const r = await apiRequest<{ liked: boolean; likeCount: number }>('/api/community/like', {
        method: 'POST',
        body: { targetType: 'topic', targetId: topic.id },
      });
      if (!r.ok || !r.data) throw new Error('操作失败');
      setTopic({ ...topic, isLikedByMe: r.data.liked, likeCount: r.data.likeCount });
    } catch {
      setTopic({ ...topic, isLikedByMe: wasLiked, likeCount: topic.likeCount });
    }
  }, [topic, setTopic]);

  const handleTopicFavorite = useCallback(async () => {
    if (!topic) return;
    const wasFav = topic.isFavoritedByMe;
    setTopic({
      ...topic,
      isFavoritedByMe: !wasFav,
      favoriteCount: topic.favoriteCount + (wasFav ? -1 : 1),
    });
    try {
      const r = await apiRequest<{ favorited: boolean; favoriteCount: number }>('/api/community/favorite', {
        method: 'POST',
        body: { topicId: topic.id },
      });
      if (!r.ok || !r.data) throw new Error('操作失败');
      setTopic({ ...topic, isFavoritedByMe: r.data.favorited, favoriteCount: r.data.favoriteCount });
    } catch {
      setTopic({ ...topic, isFavoritedByMe: wasFav, favoriteCount: topic.favoriteCount });
    }
  }, [topic, setTopic]);

  const handleDeleteTopic = useCallback(async () => {
    if (!topic) return;
    try {
      const r = await apiRequest(`/api/community/topics/${topic.id}`, {
        method: 'DELETE',
      });
      if (!r.ok) throw new Error(r.error ?? '删除失败');
      router.push('/community');
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  }, [topic, router, categorySlug, setError]);

  return { handleTopicLike, handleTopicFavorite, handleDeleteTopic };
}
