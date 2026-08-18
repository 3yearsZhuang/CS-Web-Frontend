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
  CommunityCommentDetail,
  CommunityPost,
  CommunityPostDetail,
  NestedCommentsResult,
  PaginatedComments,
} from '@/modules/community/types';
import { apiRequest } from '@/shared/hooks/use-api-request';

const REPLIES_PAGE_SIZE = 10;

interface CurrentUserResponse {
  user: {
    id: string;
    role: 'user' | 'admin';
  };
}

interface TopicResponse {
  topic: CommunityPostDetail;
}

/** 主题详情页状态 */
export interface TopicDetailState {
  topic: CommunityPostDetail | null;
  setTopic: (topic: CommunityPostDetail | null) => void;
  replies: CommunityCommentDetail[];
  setReplies: (updater: CommunityCommentDetail[] | ((prev: CommunityCommentDetail[]) => CommunityCommentDetail[])) => void;
  replyPage: number;
  setReplyPage: (page: number) => void;
  replyTotalPages: number;
  replyTotal: number;
  loading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
  currentUser: CurrentUser | null;
  relatedTopics: CommunityPost[];
  loadTopic: () => Promise<void>;
  loadReplies: () => Promise<void>;
  nestedRepliesLoader: (parentId: string) => Promise<NestedCommentsResult | null>;
}

/** 主题详情页数据加载 hook */
export function useTopicDetail(topicId: string): TopicDetailState {
  const [topic, setTopic] = useState<CommunityPostDetail | null>(null);
  const [replies, setReplies] = useState<CommunityCommentDetail[]>([]);
  const [replyPage, setReplyPage] = useState(1);
  const [replyTotalPages, setReplyTotalPages] = useState(0);
  const [replyTotal, setReplyTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [relatedTopics, setRelatedTopics] = useState<CommunityPost[]>([]);

  // 加载当前用户（可选，未登录也允许浏览）
  useEffect(() => {
    apiRequest<CurrentUserResponse>('/api/auth/me')
      .then((r) => {
        if (!r.ok || !r.data) return;
        setCurrentUser({ id: r.data.user.id, role: r.data.user.role });
      });
  }, []);

  // 加载主题详情
  const loadTopic = useCallback(async () => {
    try {
      const r = await apiRequest<TopicResponse>(`/api/community/topics/${topicId}`);
      if (!r.ok) {
        if (r.status === 404) throw new Error('主题不存在或已删除');
        throw new Error('加载失败');
      }
      setTopic(r.data?.topic ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    }
  }, [topicId]);

  // 加载主回复列表
  const loadReplies = useCallback(async () => {
    try {
      const url = `/api/community/topics/${topicId}/replies?page=${replyPage}&page_size=${REPLIES_PAGE_SIZE}`;
      const r = await apiRequest<PaginatedComments>(url);
      if (!r.ok) throw new Error('加载回复失败');
      setReplies(r.data?.items ?? []);
      setReplyTotalPages(r.data?.totalPages ?? 0);
      setReplyTotal(r.data?.total ?? 0);
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
    async (parentId: string): Promise<NestedCommentsResult | null> => {
      try {
        const r = await apiRequest<NestedCommentsResult>(`/api/community/replies/${parentId}/nested`);
        if (!r.ok) return null;
        return r.data;
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
    apiRequest<{ items: CommunityPost[] }>(`/api/community/topics?${params.toString()}`)
      .then((r) => {
        if (!r.ok || !r.data) return;
        const items = r.data.items ?? [];
        if (cancelled) return;
        setRelatedTopics(items.filter((t) => t.id !== topic.id).slice(0, 5));
      });
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
