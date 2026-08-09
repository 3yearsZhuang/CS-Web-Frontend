'use client';

/**
 * @file useNotificationsPreview — 头像菜单/通知铃铛共用的轻量通知预览 Hook
 *
 * 只取「未读数 + 最近若干条」，无分页、无 URL 同步，适合下拉菜单内嵌。
 * 与 `app/notifications/use-notifications.ts`（通知中心页专用，带分页/筛选/URL 同步）区分。
 */

import { useState, useEffect, useCallback } from 'react';
import type { Notification } from '@/app/notifications/use-notifications';
import { useAuth } from '@/shared/hooks/use-auth';

interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  unreadCount: number;
}

/**
 * @param previewSize 预览条数
 * @param enabled     是否启用拉取。默认 true；建议传 `open && isLoggedIn`，
 *                    仅当用户已登录且菜单展开时才请求，避免未登录时对公开页发起
 *                    通知请求（旧逻辑会在 401 时直接 router.push('/login')，把访客/已登录用户踢出）。
 */
export function useNotificationsPreview(previewSize = 5, enabled = true) {
  // 登录态以 useAuth 为唯一事实来源，不再另起探测请求。
  const { isLoggedIn } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchNotifications = useCallback(async () => {
    // 未启用或未登录：清空并静默退出，绝不发起请求、绝不跳转登录。
    if (!enabled || !isLoggedIn) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('page_size', String(previewSize));

      const res = await fetch(`/api/notifications?${params.toString()}`);
      // 仅以 useAuth 的登录态为准；通知接口异常（含 401）一律静默处理，
      // 避免一个后台通知请求失败就把已登录用户踢出登录页。
      if (!res.ok) {
        setNotifications([]);
        setUnreadCount(0);
        setLoading(false);
        return;
      }

      const data: NotificationsResponse = await res.json();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      setError('load failed');
    } finally {
      setLoading(false);
    }
  }, [previewSize, enabled, isLoggedIn]);

  useEffect(() => {
    if (!enabled || !isLoggedIn) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }
    fetchNotifications();
  }, [fetchNotifications, enabled, isLoggedIn]);

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
