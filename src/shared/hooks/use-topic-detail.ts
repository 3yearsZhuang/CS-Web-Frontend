'use client';

/**
 * @file useTopicDetail — 主题详情页数据加载 hook
 *
 * 聚合主题详情、主回复列表、当前用户的加载逻辑，以及楼中楼加载器。
 * 仅负责数据流，UI 状态（如编辑模式）由调用方维护。
 */

import { useCallback, useEffect, useState } from 'react';
import type {
  CurrentUser,
  ForumReplyDetail,
  ForumTopic,
  ForumTopicDetail,
  NestedRepliesResult,
  PaginatedReplies,
} from '@/modules/community/types';

const REPLIES_PAGE_SIZE = 10;

interface CurrentUserResponse {
  user: {
    id: string;
    role: 'user' | 'admin';
  };
}

interface TopicResponse {
  topic: ForumTopicDetail;
}

/** 主题详情页状态 */
export interface TopicDetailState {
  topic: ForumTopicDetail | null;
  setTopic: (topic: ForumTopicDetail | null) => void;
  replies: ForumReplyDetail[];
  setReplies: (updater: ForumReplyDetail[] | ((prev: ForumReplyDetail[]) => ForumReplyDetail[])) => void;
  replyPage: number;
  setReplyPage: (page: number) => void;
  replyTotalPages: number;
  replyTotal: number;
  loading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  currentUser: CurrentUser | null;
  relatedTopics: ForumTopic[];
  loadTopic: () => Promise<void>;
  loadReplies: () => Promise<void>;
  nestedRepliesLoader: (parentId: string) => Promise<NestedRepliesResult | null>;
}

/** 主题详情页数据加载 hook */
export function useTopicDetail(topicId: string): TopicDetailState {
  const [topic, setTopic] = useState<ForumTopicDetail | null>(null);
  const [replies, setReplies] = useState<ForumReplyDetail[]>([]);
  const [replyPage, setReplyPage] = useState(1);
  const [replyTotalPages, setReplyTotalPages] = useState(0);
  const [replyTotal, setReplyTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [relatedTopics, setRelatedTopics] = useState<ForumTopic[]>([]);

  // 加载当前用户（可选，未登录也允许浏览）
  useEffect(() => {
    fetch('/api/auth/me')
      .then(async (res) => {
        if (!res.ok) return null;
        const data = (await res.json()) as CurrentUserResponse;
        return data.user;
      })
      .then((u) => {
        if (u) setCurrentUser({ id: u.id, role: u.role });
      })
      .catch(() => {
        // 静默失败 — 未登录用户仍可浏览
      });
  }, []);

  // 加载主题详情
  const loadTopic = useCallback(async () => {
    try {
      const res = await fetch(`/api/forum/topics/${topicId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('主题不存在或已删除');
        throw new Error('加载失败');
      }
      const data = (await res.json()) as TopicResponse;
      setTopic(data.topic);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    }
  }, [topicId]);

  // 加载主回复列表
  const loadReplies = useCallback(async () => {
    try {
      const url = `/api/forum/topics/${topicId}/replies?page=${replyPage}&page_size=${REPLIES_PAGE_SIZE}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('加载回复失败');
      const data = (await res.json()) as PaginatedReplies;
      setReplies(data.items ?? []);
      setReplyTotalPages(data.totalPages ?? 0);
      setReplyTotal(data.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载回复失败');
    }
  }, [topicId, replyPage]);

  // 初次加载
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([loadTopic(), loadReplies()])
      .catch(() => {
        if (cancelled) return;
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 首次加载依赖 topicId 即可
  }, [topicId]);

  const nestedRepliesLoader = useCallback(
    async (parentId: string): Promise<NestedRepliesResult | null> => {
      try {
        const res = await fetch(`/api/forum/replies/${parentId}/nested`);
        if (!res.ok) return null;
        return (await res.json()) as NestedRepliesResult;
      } catch {
        return null;
      }
    },
    [],
  );

  // 加载相关推荐（同版块热门帖子，排除当前帖子）
  useEffect(() => {
    if (!topic?.category?.slug) return;
    let cancelled = false;
    const params = new URLSearchParams();
    params.set('category', topic.category.slug);
    params.set('sort', 'hot');
    params.set('page_size', '6');
    fetch(`/api/community/forum/topics?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) return null;
        const data = (await res.json()) as { items: ForumTopic[] };
        return data.items ?? [];
      })
      .then((items) => {
        if (cancelled || !items) return;
        setRelatedTopics(items.filter((t) => t.id !== topic.id).slice(0, 5));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [topic?.category?.slug, topic?.id]);

  return {
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
    loadTopic,
    loadReplies,
    nestedRepliesLoader,
  };
}
