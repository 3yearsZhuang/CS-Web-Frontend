'use client';

/**
 * @file useAnnouncements — 公告列表 数据逻辑 hook（C-19 收敛样板，对齐 useFollow）
 *
 * 从 announcement-banner.tsx 抽出 GET /api/announcements 的拉取逻辑（含 loading 态、
 * 持久化 dismissed 过滤）。组件仅保留「本次会话可见性（visible）」与 dismiss 时序 UI。
 *
 * - reload() 拉取并过滤掉本地已 dismissed 的公告（localStorage 持久）
 * - 组件侧 dismiss 仅隐藏本次会话 + 持久化，下次 reload 自动排除
 */

import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '@/shared/hooks/use-api-request';

export type AnnouncementLevel = 'info' | 'warning' | 'success' | 'error';

export interface Announcement {
  id: string;
  title: string;
  content: string | null;
  level: AnnouncementLevel;
  isDismissible: boolean;
}

const STORAGE_KEY = 'dismissed_announcements';

function getDismissedSet(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

/** 持久化某公告为 dismissed（localStorage），下次 reload 自动排除 */
export function saveDismissed(id: string): void {
  try {
    const set = getDismissedSet();
    set.add(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // localStorage 不可用时静默忽略
  }
}

interface UseAnnouncementsResult {
  announcements: Announcement[];
  loading: boolean;
  reload: () => Promise<void>;
}

export function useAnnouncements(): UseAnnouncementsResult {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    // 收敛到 apiRequest：不抛异常，失败（含网络错误）统一归为 result.ok === false
    const result = await apiRequest<{ announcements?: Announcement[] }>('/api/announcements');
    if (result.ok && result.data) {
      const dismissed = getDismissedSet();
      setAnnouncements((result.data.announcements || []).filter((a) => !dismissed.has(a.id)));
    } else {
      setAnnouncements([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { announcements, loading, reload };
}
