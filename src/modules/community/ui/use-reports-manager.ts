'use client';

/**
 * @file useReportsManager — 举报处理数据逻辑 hook（P1-6 / C-19 架构收敛）
 *
 * 从 reports-manager.tsx 抽出举报列表加载 + 处理/驳回 2 个操作，
 * 全部裸 fetch 收敛到 apiRequest（统一错误归一/JSON/状态判定）。
 * 操作成功后本地移除该行（保留原始「处理即从列表消失」行为，无需重拉）。
 * 组件保留状态过滤视图态与 confirm 时序，仅作为 UI 壳。
 */

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiRequest } from '@/shared/hooks/use-api-request';
import { getError } from './community-admin-utils';

export type ReportStatusFilter = 'pending' | 'resolved' | 'dismissed' | 'all';

export interface ReportRow {
  id: string;
  reporterName: string | null;
  targetType: 'topic' | 'comment';
  targetId: string;
  reason: string;
  detail: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

interface ReportsResponse {
  items: ReportRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UseReportsManagerResult {
  reports: ReportRow[];
  loading: boolean;
  error: string | null;
  actionError: string | null;
  busyIds: Set<string>;
  loadReports: (filter: ReportStatusFilter) => Promise<void>;
  resolveReport: (id: string) => Promise<void>;
  dismissReport: (id: string) => Promise<void>;
}

export function useReportsManager(): UseReportsManagerResult {
  const tc = useTranslations('communityAdmin');
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const loadReports = useCallback(
    async (filter: ReportStatusFilter) => {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      const result = await apiRequest<ReportsResponse>(`/api/admin/community/reports?${params.toString()}`);
      if (!result.ok) {
        setError(getError(result.data, tc('loadFailed')));
        setReports([]);
      } else {
        setReports(result.data?.items ?? []);
      }
      setLoading(false);
    },
    [tc],
  );

  const runAction = useCallback(
    async (id: string, action: 'resolve' | 'dismiss') => {
      setActionError(null);
      setBusyIds((s) => new Set(s).add(id));
      try {
        const result = await apiRequest(`/api/admin/community/reports/${id}?action=${action}`, { method: 'POST' });
        if (!result.ok) {
          throw new Error(getError(result.data, tc('actionFailed')));
        }
        setReports((prev) => prev.filter((r) => r.id !== id));
      } catch (err) {
        setActionError(err instanceof Error ? err.message : tc('actionFailed'));
      } finally {
        setBusyIds((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
      }
    },
    [tc],
  );

  const resolveReport = useCallback((id: string) => runAction(id, 'resolve'), [runAction]);
  const dismissReport = useCallback((id: string) => runAction(id, 'dismiss'), [runAction]);

  return {
    reports,
    loading,
    error,
    actionError,
    busyIds,
    loadReports,
    resolveReport,
    dismissReport,
  };
}
