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
import { useAdminCollection } from './use-admin-collection';
import type { Announcement, AnnouncementLevel } from '@/modules/announcements/types';

// 类型收敛（重复实现治理波次 B1a）：复用 announcements 域规范类型（子集字段兼容）
export type AnnouncementItem = Announcement;
export type { AnnouncementLevel } from '@/modules/announcements/types';

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
  const {
    items: announcements,
    loading,
    error,
    fetchList,
  } = useAdminCollection<AnnouncementItem>('announcementsAdmin');
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const loadAnnouncements = useCallback(() => fetchList('/api/admin/announcements'), [fetchList]);

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
