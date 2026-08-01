'use client';

/**
 * @file useTopicActions — 主题业务回调 hook
 *
 * 封装主题详情页主题相关写操作（点赞/收藏/删除，乐观更新+失败回滚）。
 * 与 useTopicDetail 解耦：数据加载由 useTopicDetail 负责，写操作由本 hook 负责。
 */

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { ForumTopicDetail } from '@/modules/community/types';

interface UseTopicActionsParams {
  topic: ForumTopicDetail | null;
  setTopic: (topic: ForumTopicDetail | null) => void;
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
      const res = await fetch('/api/community/forum/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType: 'topic', targetId: topic.id }),
      });
      if (!res.ok) throw new Error('操作失败');
      const data = (await res.json()) as { liked: boolean; likeCount: number };
      setTopic({ ...topic, isLikedByMe: data.liked, likeCount: data.likeCount });
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
      const res = await fetch('/api/community/forum/favorite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId: topic.id }),
      });
      if (!res.ok) throw new Error('操作失败');
      const data = (await res.json()) as { favorited: boolean; favoriteCount: number };
      setTopic({ ...topic, isFavoritedByMe: data.favorited, favoriteCount: data.favoriteCount });
    } catch {
      setTopic({ ...topic, isFavoritedByMe: wasFav, favoriteCount: topic.favoriteCount });
    }
  }, [topic, setTopic]);

  const handleDeleteTopic = useCallback(async () => {
    if (!topic) return;
    try {
      const res = await fetch(`/api/community/forum/topics/${topic.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? '删除失败');
      }
      router.push(`/community/forum/${categorySlug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  }, [topic, router, categorySlug, setError]);

  return { handleTopicLike, handleTopicFavorite, handleDeleteTopic };
}
