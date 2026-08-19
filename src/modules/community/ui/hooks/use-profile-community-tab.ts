/**
 * @file useProfileCommunityTab — 个人主页社区 Tab 数据逻辑（C-19 收敛）
 *
 * 从 `community-profile-tab.tsx` 抽出：三段 sub-tab（我的主题 / 回复 / 收藏）的
 * 列表加载 + 分页 + 切换 + 错误态。组件仅作 UI 壳。
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import type {
  CommunityPost,
  CommunityCommentDetail,
  PaginatedPosts,
  PaginatedComments,
} from '@/modules/community/types';
import { apiRequest } from '@/shared/hooks/use-api-request';
import { useTranslations } from 'next-intl';

const PAGE_SIZE = 10;

/** Sub-tab 类型 */
export type CommunitySubTab = 'topics' | 'replies' | 'favorites';

export interface UseProfileCommunityTabResult {
  activeSubTab: CommunitySubTab;
  handleTabChange: (tab: CommunitySubTab) => void;
  topics: CommunityPost[];
  replies: CommunityCommentDetail[];
  page: number;
  setPage: (p: number) => void;
  totalPages: number;
  total: number;
  loading: boolean;
  error: string | null;
}

export function useProfileCommunityTab(userId: string): UseProfileCommunityTabResult {
  const t = useTranslations('communityProfile');
  const [activeSubTab, setActiveSubTab] = useState<CommunitySubTab>('topics');

  // 主题列表（topics / favorites 共用）
  const [topics, setTopics] = useState<CommunityPost[]>([]);
  // 回复列表
  const [replies, setReplies] = useState<CommunityCommentDetail[]>([]);

  // 分页状态
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);

  // 加载状态
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** 加载数据 — 由 activeSubTab 与 page 触发 */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    let url: string;
    if (activeSubTab === 'topics') {
      url = `/api/community/users/${userId}/topics?page=${page}&page_size=${PAGE_SIZE}`;
    } else if (activeSubTab === 'replies') {
      url = `/api/community/users/${userId}/replies?page=${page}&page_size=${PAGE_SIZE}`;
    } else {
      url = `/api/community/favorites?page=${page}&page_size=${PAGE_SIZE}`;
    }

    const result = await apiRequest<PaginatedPosts | PaginatedComments>(url);
    if (!result.ok) {
      setError(result.error ?? t('loadFailed'));
      setTopics([]);
      setReplies([]);
      setTotal(0);
      setTotalPages(0);
      setLoading(false);
      return;
    }
    const data = result.data;
    if (activeSubTab === 'replies') {
      const d = data as PaginatedComments | null;
      setReplies(d?.items ?? []);
      setTopics([]);
      setTotal(d?.total ?? 0);
      setTotalPages(d?.totalPages ?? 0);
    } else {
      const d = data as PaginatedPosts | null;
      setTopics(d?.items ?? []);
      setReplies([]);
      setTotal(d?.total ?? 0);
      setTotalPages(d?.totalPages ?? 0);
    }
    setLoading(false);
  }, [activeSubTab, page, userId, t]);

  // sub-tab 或 page 变化时重新加载
  useEffect(() => {
    void loadData();
  }, [loadData]);

  /** 切换 sub-tab — 重置分页 */
  const handleTabChange = (tab: CommunitySubTab) => {
    if (tab === activeSubTab) return;
    setActiveSubTab(tab);
    setPage(1);
  };

  return {
    activeSubTab,
    handleTabChange,
    topics,
    replies,
    page,
    setPage,
    totalPages,
    total,
    loading,
    error,
  };
}
