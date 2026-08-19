'use client';

/**
 * @file useTopicsManager — 主题审核数据逻辑 hook（P1-6 / C-19 架构收敛）
 *
 * 从 topics-manager.tsx 抽出主题列表/版块加载 + 隐藏/恢复/置顶/加精/硬删 5 个操作，
 * 全部裸 fetch 收敛到 apiRequest（统一错误归一/JSON/状态判定）。
 * 组件保留筛选/排序/搜索/分页等视图态与 confirm 时序，仅作为 UI 壳。
 */

import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiRequest, type ApiRequestResult } from '@/shared/hooks/use-api-request';
import { getError, TOPICS_PAGE_SIZE, type SortValue, type TopicStatus } from '../community-admin-utils';
import type { CommunityCategory, CommunityPost, PaginatedPosts } from '@/modules/community/types';

export interface TopicsQuery {
  sort: SortValue;
  page: number;
  page_size: number;
  status?: TopicStatus | 'all';
  category?: string;
  search?: string;
}

interface UseTopicsManagerResult {
  topics: CommunityPost[];
  categories: CommunityCategory[];
  loading: boolean;
  error: string | null;
  actionError: string | null;
  total: number;
  totalPages: number;
  busyIds: Set<string>;
  loadCategories: () => Promise<void>;
  loadTopics: (query: TopicsQuery) => Promise<void>;
  hideTopic: (id: string, reason: string) => Promise<void>;
  restoreTopic: (id: string) => Promise<void>;
  togglePin: (id: string, pinned: boolean) => Promise<void>;
  toggleFeature: (id: string, featured: boolean) => Promise<void>;
  deleteTopic: (id: string) => Promise<void>;
}

export function useTopicsManager(): UseTopicsManagerResult {
  const t = useTranslations('communityAdmin');
  const [topics, setTopics] = useState<CommunityPost[]>([]);
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  // 缓存最近一次查询，操作成功后用同一查询刷新列表
  const lastQuery = useRef<TopicsQuery | null>(null);

  const loadCategories = useCallback(async () => {
    const result = await apiRequest<{ items: CommunityCategory[] }>(
      '/api/admin/community/community/categories',
    );
    if (result.ok && result.data) {
      setCategories(result.data.items ?? []);
    }
    // 失败静默（筛选下拉仅辅助）
  }, []);

  const loadTopics = useCallback(
    async (query: TopicsQuery) => {
      lastQuery.current = query;
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          sort: query.sort,
          page: String(query.page),
          page_size: String(query.page_size),
        });
        if (query.status && query.status !== 'all') params.set('status', query.status);
        if (query.category) params.set('category', query.category);
        if (query.search && query.search.trim()) params.set('search', query.search.trim());

        const result = await apiRequest<PaginatedPosts>(
          `/api/admin/community/community/topics?${params}`,
        );
        if (!result.ok) {
          throw new Error(getError(result.data, t('loadFailed')));
        }
        setTopics(result.data?.items ?? []);
        setTotal(result.data?.total ?? 0);
        setTotalPages(result.data?.totalPages ?? 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('loadFailed'));
        setTopics([]);
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  /** 通用操作调用 — 设置 busy + 错误处理 + 成功后刷新 */
  const runAction = useCallback(
    async (topicId: string, fetcher: () => Promise<ApiRequestResult<unknown>>) => {
      setActionError(null);
      setBusyIds((s) => new Set(s).add(topicId));
      try {
        const result = await fetcher();
        if (!result.ok) {
          throw new Error(getError(result.data, t('actionFailed')));
        }
        if (lastQuery.current) await loadTopics(lastQuery.current);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : t('actionFailed'));
      } finally {
        setBusyIds((s) => {
          const next = new Set(s);
          next.delete(topicId);
          return next;
        });
      }
    },
    [t, loadTopics],
  );

  const hideTopic = useCallback(
    (id: string, reason: string) =>
      runAction(id, () =>
        apiRequest(`/api/admin/community/community/topics/${id}/hide`, {
          method: 'POST',
          body: { reason: reason.trim() || undefined },
        }),
      ),
    [runAction],
  );

  const restoreTopic = useCallback(
    (id: string) =>
      runAction(id, () =>
        apiRequest(`/api/admin/community/community/topics/${id}/restore`, { method: 'POST' }),
      ),
    [runAction],
  );

  const togglePin = useCallback(
    (id: string, pinned: boolean) =>
      runAction(id, () =>
        apiRequest(`/api/admin/community/community/topics/${id}/pin`, {
          method: 'POST',
          body: { pinned },
        }),
      ),
    [runAction],
  );

  const toggleFeature = useCallback(
    (id: string, featured: boolean) =>
      runAction(id, () =>
        apiRequest(`/api/admin/community/community/topics/${id}/feature`, {
          method: 'POST',
          body: { featured },
        }),
      ),
    [runAction],
  );

  const deleteTopic = useCallback(
    (id: string) =>
      runAction(id, () =>
        apiRequest(`/api/admin/community/community/topics/${id}`, { method: 'DELETE' }),
      ),
    [runAction],
  );

  return {
    topics,
    categories,
    loading,
    error,
    actionError,
    total,
    totalPages,
    busyIds,
    loadCategories,
    loadTopics,
    hideTopic,
    restoreTopic,
    togglePin,
    toggleFeature,
    deleteTopic,
  };
}
