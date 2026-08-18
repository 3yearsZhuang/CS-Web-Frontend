'use client';

/**
 * @file useNotificationBell — 通知铃铛数据逻辑 hook（P1-6 / C-19 架构收敛）
 *
 * 从 notification-bell.tsx 抽出未读数 / 通知列表的拉取与「标记已读 / 全部已读」逻辑，
 * 全部裸 fetch 收敛到 apiRequest（统一错误归一 / JSON / 状态判定）。
 * markRead / markAllRead 保留原组件的乐观更新 + 失败回滚。
 * 组件仅保留 UI、open 态与 outside-click / Escape 时序。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiRequest } from '@/shared/hooks/use-api-request';

export type NotificationType = 'system' | 'admin' | 'activity' | 'like' | 'reply' | 'favorite' | 'follow';

export interface Notification {
  id: string;
  title: string;
  content: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  senderId: string;
}

interface UseNotificationBellResult {
  unreadCount: number;
  notifications: Notification[];
  loadingList: boolean;
  fetchUnreadCount: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
}

export function useNotificationBell(): UseNotificationBellResult {
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // 用 ref 镜像最新状态，供 markRead / markAllRead 在稳定 useCallback 内读取快照
  // （避免闭包过期 + 规避 react-hooks/exhaustive-deps）
  const notificationsRef = useRef<Notification[]>([]);
  const unreadCountRef = useRef(0);
  useEffect(() => {
    notificationsRef.current = notifications;
    unreadCountRef.current = unreadCount;
  }, [notifications, unreadCount]);

  const fetchUnreadCount = useCallback(async () => {
    const result = await apiRequest<{ unreadCount: number }>('/api/notifications/unread-count');
    if (result.ok && result.data) {
      setUnreadCount(result.data.unreadCount ?? 0);
    }
    // 失败静默：保持原值（与原组件行为一致）
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoadingList(true);
    const result = await apiRequest<{ notifications: Notification[] }>('/api/notifications?page_size=5');
    if (result.ok && result.data) {
      setNotifications(result.data.notifications ?? []);
    }
    // 失败静默：保留原列表
    setLoadingList(false);
  }, []);

  const markRead = useCallback(async (id: string) => {
    const current = notificationsRef.current.find((n) => n.id === id);
    if (!current || current.isRead) return; // 已读则跳过（与原组件一致）

    // 乐观更新
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));

    const result = await apiRequest(`/api/notifications/${id}/read`, { method: 'POST' });
    if (!result.ok) {
      // 失败回滚
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: false } : n)));
      setUnreadCount((prev) => prev + 1);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const unreadIds = notificationsRef.current.filter((n) => !n.isRead).map((n) => n.id);
    if (unreadIds.length === 0) return;
    const prevUnread = unreadCountRef.current;

    // 乐观更新
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);

    const result = await apiRequest('/api/notifications/read-all', { method: 'POST' });
    if (!result.ok) {
      // 失败回滚
      setNotifications((prev) => prev.map((n) => (unreadIds.includes(n.id) ? { ...n, isRead: false } : n)));
      setUnreadCount(prevUnread);
    }
  }, []);

  return {
    unreadCount,
    notifications,
    loadingList,
    fetchUnreadCount,
    fetchNotifications,
    markRead,
    markAllRead,
  };
}
