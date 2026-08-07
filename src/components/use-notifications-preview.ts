'use client';

/**
 * @file useNotificationsPreview — 头像菜单/通知铃铛共用的轻量通知预览 Hook
 *
 * 只取「未读数 + 最近若干条」，无分页、无 URL 同步，适合下拉菜单内嵌。
 * 与 `app/notifications/use-notifications.ts`（通知中心页专用，带分页/筛选/URL 同步）区分。
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Notification } from '@/app/notifications/use-notifications';

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  unreadCount: number;
}

export function useNotificationsPreview(previewSize = 5) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('page_size', String(previewSize));

      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (res.status === 401) {
        router.push('/login');
        return;
      }
      if (!res.ok) throw new Error('load failed');

      const data: NotificationsResponse = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      setError('load failed');
    } finally {
      setLoading(false);
    }
  }, [previewSize, router]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // 登录态探测：未登录（401）则不渲染通知区块
  useEffect(() => {
    const checkLogin = async () => {
      try {
        const res = await fetch('/api/notifications/unread-count');
        if (res.status === 401) {
          setIsLoggedIn(false);
          return;
        }
        if (res.ok) setIsLoggedIn(true);
      } catch {
        // 网络错误时保守视为已登录，避免误隐藏
      }
    };
    checkLogin();
  }, []);

  const markRead = useCallback(
    async (id: string) => {
      const target = notifications.find((n) => n.id === id);
      if (!target || target.isRead) return;

      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));

      try {
        await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      } catch {
        setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)));
        setUnreadCount((prev) => prev + 1);
      }
    },
    [notifications],
  );

  const markAllRead = useCallback(async () => {
    if (unreadCount === 0) return;

    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    const prevCount = unreadCount;
    setUnreadCount(0);

    try {
      const res = await fetch('/api/notifications/read-all', { method: 'POST' });
      if (!res.ok) throw new Error('failed');
    } catch {
      setNotifications((prev) =>
        prev.map((n) =>
          notifications.some((u) => u.id === n.id && !u.isRead) ? { ...n, isRead: false } : n,
        ),
      );
      setUnreadCount(prevCount);
    }
  }, [unreadCount, notifications]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    isLoggedIn,
    fetchNotifications,
    markRead,
    markAllRead,
  };
}
