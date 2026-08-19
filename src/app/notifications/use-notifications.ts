'use client';

/**
 * @file useNotifications — 通知中心页共享状态与逻辑 Hook
 *
 * 从 `app/notifications/page.tsx` 拆出，遵循 GENERAL 2.2「展示与容器分离」、
 * 2.4「逻辑 > 150 行提为 Hook / 组件 > 500 行拆分」。各渲染子组件复用本 Hook 返回值。
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiRequest } from '@/shared/hooks/use-api-request';

export type NotificationType = 'system' | 'admin' | 'activity' | 'like' | 'reply' | 'favorite' | 'follow';
export type FilterType = 'all' | 'unread' | NotificationType;

type TFn = (key: string, values?: Record<string, string | number | Date>) => string;

export function filterTabs(t: TFn): { value: FilterType; label: string }[] {
  return [
    { value: 'all', label: t('filterAll') },
    { value: 'unread', label: t('filterUnread') },
    { value: 'system', label: t('filterSystem') },
    { value: 'admin', label: '管理员' },
    { value: 'activity', label: '活动' },
    { value: 'like', label: '点赞' },
    { value: 'reply', label: '回复' },
    { value: 'favorite', label: '收藏' },
    { value: 'follow', label: '关注' },
  ];
}

export interface Notification {
  id: string;
  title: string;
  content: string | null;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  senderId: string | null;
}

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  unreadCount: number;
}

export const TYPE_STYLES: Record<NotificationType, { label: string; className: string }> = {
  system: { label: 'SYS', className: 'text-[var(--primary)] bg-[var(--primary)]/10' },
  admin: { label: 'ADM', className: 'text-red-500 bg-red-500/10' },
  activity: { label: 'ACT', className: 'text-emerald-500 bg-emerald-500/10' },
  like: { label: 'LIKE', className: 'text-pink-500 bg-pink-500/10' },
  reply: { label: 'REPLY', className: 'text-sky-500 bg-sky-500/10' },
  favorite: { label: 'FAV', className: 'text-amber-500 bg-amber-500/10' },
  follow: { label: 'FOLLOW', className: 'text-violet-500 bg-violet-500/10' },
};

export function useNotifications() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialPage = Number(searchParams.get('page')) || 1;
  const initialFilter = (searchParams.get('filter') as FilterType) || 'all';

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<FilterType>(initialFilter);
  const pageSize = 20;

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('page_size', String(pageSize));

      if (filter === 'unread') {
        params.set('is_read', 'false');
      } else if (filter === 'system' || filter === 'admin' || filter === 'activity') {
        params.set('type', filter);
      }

      const r = await apiRequest<NotificationsResponse>(`/api/notifications?${params.toString()}`);

      if (r.status === 401) {
        router.push('/login');
        return;
      }

      if (!r.ok) throw new Error('加载失败');

      const data = r.data;
      setNotifications(data?.notifications ?? []);
      setTotal(data?.total ?? 0);
      setTotalPages(data?.totalPages ?? 1);
      setUnreadCount(data?.unreadCount ?? 0);
    } catch {
      setError('加载失败，请稍后再试');
    } finally {
      setLoading(false);
    }
  }, [page, filter, router]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // URL 同步
  useEffect(() => {
    const params = new URLSearchParams();
    if (page !== 1) params.set('page', String(page));
    if (filter !== 'all') params.set('filter', filter);

    const queryString = params.toString();
    router.replace(`/notifications${queryString ? `?${queryString}` : ''}`, { scroll: false });
  }, [page, filter, router]);

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setPage(1);
  };

  const handleMarkRead = useCallback(
    async (id: string) => {
      const notification = notifications.find((n) => n.id === id);
      if (!notification || notification.isRead) return;

      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        const r = await apiRequest(`/api/notifications/${id}/read`, { method: 'POST' });
        if (!r.ok) throw new Error('failed');
      } catch {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)));
        setUnreadCount((prev) => prev + 1);
      }
    },
    [notifications],
  );

  const handleMarkAllRead = useCallback(async () => {
    if (unreadCount === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    const prevCount = unreadCount;
    setUnreadCount(0);

    try {
      const r = await apiRequest('/api/notifications/read-all', { method: 'POST' });
      if (!r.ok) throw new Error('failed');
    } catch {
      setNotifications((prev) =>
        prev.map((n) =>
          notifications.some((u) => u.id === n.id && !u.isRead) ? { ...n, isRead: false } : n,
        ),
      );
      setUnreadCount(prevCount);
    }
  }, [unreadCount, notifications]);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return {
    router,
    notifications,
    loading,
    error,
    page,
    totalPages,
    total,
    unreadCount,
    filter,
    fetchNotifications,
    handleFilterChange,
    handleMarkRead,
    handleMarkAllRead,
    handlePageChange,
    pageSize,
  };
}

export type NotificationsState = ReturnType<typeof useNotifications>;
