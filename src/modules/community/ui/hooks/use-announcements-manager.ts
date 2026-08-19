'use client';

/**
 * @file useAnnouncementsManager — 公告管理数据逻辑 hook（P1-6 / C-19 架构收敛）
 *
 * 从 announcements-manager.tsx 抽出公告列表加载 + 启用/停用/删除/新建 4 个操作，
 * 全部裸 fetch 收敛到 apiRequest（统一错误归一/JSON/状态判定）。
 * 组件保留新建表单视图态、字段校验与 confirm 时序，仅作为 UI 壳。
 */

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiRequest, type ApiRequestResult } from '@/shared/hooks/use-api-request';
import { getError } from '../community-admin-utils';

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string | null;
  level: 'info' | 'warning' | 'success' | 'error';
  isActive: boolean;
  isDismissible: boolean;
  priority: number;
  expiresAt: string | null;
  createdAt: string;
}

interface AnnouncementsResponse {
  items: AnnouncementItem[];
  total: number;
}

export type AnnouncementLevel = AnnouncementItem['level'];

export interface CreateAnnouncementInput {
  title: string;
  content: string;
  level: AnnouncementLevel;
  priority: number;
}

export interface UseAnnouncementsManagerResult {
  announcements: AnnouncementItem[];
  loading: boolean;
  error: string | null;
  actionError: string | null;
  busyIds: Set<string>;
  loadAnnouncements: () => Promise<void>;
  toggleActive: (id: string, isActive: boolean) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  createAnnouncement: (input: CreateAnnouncementInput) => Promise<ApiRequestResult<unknown>>;
}

export function useAnnouncementsManager(): UseAnnouncementsManagerResult {
  const t = useTranslations('announcementsAdmin');
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const loadAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await apiRequest<AnnouncementsResponse>('/api/admin/announcements');
    if (!result.ok) {
      setError(getError(result.data, t('loadFailed')));
      setAnnouncements([]);
    } else {
      setAnnouncements(result.data?.items ?? []);
    }
    setLoading(false);
  }, [t]);

  const runAction = useCallback(
    async (id: string, fetcher: () => Promise<ApiRequestResult<unknown>>) => {
      setActionError(null);
      setBusyIds((s) => new Set(s).add(id));
      try {
        const result = await fetcher();
        if (!result.ok) {
          throw new Error(getError(result.data, t('actionFailed')));
        }
        await loadAnnouncements();
      } catch (err) {
        setActionError(err instanceof Error ? err.message : t('actionFailed'));
      } finally {
        setBusyIds((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
      }
    },
    [t, loadAnnouncements],
  );

  const toggleActive = useCallback(
    (id: string, isActive: boolean) =>
      runAction(id, () =>
        apiRequest(`/api/admin/announcements/${id}`, {
          method: 'PATCH',
          body: { isActive },
        }),
      ),
    [runAction],
  );

  const deleteAnnouncement = useCallback(
    (id: string) => runAction(id, () => apiRequest(`/api/admin/announcements/${id}`, { method: 'DELETE' })),
    [runAction],
  );

  const createAnnouncement = useCallback(
    async (input: CreateAnnouncementInput): Promise<ApiRequestResult<unknown>> => {
      const result = await apiRequest('/api/admin/announcements', {
        method: 'POST',
        body: input,
      });
      if (result.ok) await loadAnnouncements();
      return result;
    },
    [loadAnnouncements],
  );

  return {
    announcements,
    loading,
    error,
    actionError,
    busyIds,
    loadAnnouncements,
    toggleActive,
    deleteAnnouncement,
    createAnnouncement,
  };
}
