'use client';

/**
 * @file useDashboardManager — 数据看板数据逻辑 hook（P1-6 / C-19 架构收敛）
 *
 * 从 dashboard-manager.tsx 抽出版板聚合加载（4 个 GET 经 Promise.all），
 * 全部裸 fetch 收敛到 apiRequest（统一错误归一/JSON/状态判定）。
 * 组件仅作 UI 壳（渲染 statCards）。
 */

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiRequest } from '@/shared/hooks/use-api-request';

export interface DashboardStats {
  totalUsers: number;
  totalTopics: number;
  totalReplies: number;
  totalCommunityPosts: number;
  totalCategories: number;
  totalAnnouncements: number;
  onlineUsers: number;
}

interface UsersCount {
  total?: number;
}
interface FeedStats {
  topicCount?: number;
  postCount?: number;
}
interface AnnouncementsCount {
  total?: number;
}
interface CategoriesList {
  items?: unknown[];
}

export interface UseDashboardManagerResult {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;
  loadStats: () => Promise<void>;
}

export function useDashboardManager(): UseDashboardManagerResult {
  const t = useTranslations('dashboard');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [usersRes, feedRes, announcementsRes, categoriesRes] = await Promise.all([
      apiRequest<UsersCount>('/api/admin/users?pageSize=1'),
      apiRequest<FeedStats>('/api/community/feed?stats=1'),
      apiRequest<AnnouncementsCount>('/api/admin/announcements'),
      apiRequest<CategoriesList>('/api/admin/community/community/categories'),
    ]);
    if (!usersRes.ok || !feedRes.ok || !announcementsRes.ok || !categoriesRes.ok) {
      setError(t('loadFailed'));
      setStats(null);
      setLoading(false);
      return;
    }
    const usersData = usersRes.data!;
    const feedStats = feedRes.data!;
    const announcementsData = announcementsRes.data!;
    const categoriesData = categoriesRes.data!;
    setStats({
      totalUsers: usersData.total ?? 0,
      totalTopics: feedStats.topicCount ?? 0,
      totalReplies: (feedStats.topicCount ?? 0) + (feedStats.postCount ?? 0),
      totalCommunityPosts: feedStats.postCount ?? 0,
      totalCategories: (categoriesData.items ?? []).length,
      totalAnnouncements: announcementsData.total ?? 0,
      onlineUsers: 0,
    });
    setLoading(false);
  }, [t]);

  return { stats, loading, error, loadStats };
}
