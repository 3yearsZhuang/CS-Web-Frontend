'use client';

/**
 * @file useUsersManager — 用户管理数据逻辑 hook（P1-6 / C-19 架构收敛）
 *
 * 从 users-manager.tsx 抽出用户列表加载 + 禁言/解禁 2 个操作，
 * 全部裸 fetch 收敛到 apiRequest（统一错误归一/JSON/状态判定）。
 * 组件保留搜索/分页视图态与 confirm 时序，仅作为 UI 壳。
 */

import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiRequest, type ApiRequestResult } from '@/shared/hooks/use-api-request';
import { getError } from '../community-admin-utils';

export interface AdminUserItem {
  id: string;
  displayName: string | null;
  email: string;
  role: 'user' | 'admin' | 'root';
  isActive: boolean;
  createdAt: string;
}

interface UsersResponse {
  users: AdminUserItem[];
  total: number;
  page: number;
  totalPages: number;
}

export interface UsersQuery {
  search: string;
  page: number;
}

export interface UseUsersManagerResult {
  users: AdminUserItem[];
  loading: boolean;
  error: string | null;
  actionError: string | null;
  total: number;
  totalPages: number;
  busyIds: Set<string>;
  loadUsers: (query: UsersQuery) => Promise<void>;
  disableUser: (id: string) => Promise<void>;
  enableUser: (id: string) => Promise<void>;
}

const PAGE_SIZE = 20;

export function useUsersManager(): UseUsersManagerResult {
  const t = useTranslations('userList');
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  // 缓存最近一次查询，操作成功后用同一查询刷新列表
  const lastQuery = useRef<UsersQuery | null>(null);

  const loadUsers = useCallback(
    async (query: UsersQuery) => {
      lastQuery.current = query;
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({ page: String(query.page), pageSize: String(PAGE_SIZE) });
      if (query.search.trim()) params.set('search', query.search.trim());
      const result = await apiRequest<UsersResponse>(`/api/admin/users?${params}`);
      if (!result.ok) {
        setError(getError(result.data, t('loadFailed')));
        setUsers([]);
      } else {
        setUsers(result.data?.users ?? []);
        setTotal(result.data?.total ?? 0);
        setTotalPages(result.data?.totalPages ?? 0);
      }
      setLoading(false);
    },
    [t],
  );

  const runAction = useCallback(
    async (userId: string, fetcher: () => Promise<ApiRequestResult<unknown>>) => {
      setActionError(null);
      setBusyIds((s) => new Set(s).add(userId));
      try {
        const result = await fetcher();
        if (!result.ok) {
          throw new Error(getError(result.data, t('actionFailed')));
        }
        if (lastQuery.current) await loadUsers(lastQuery.current);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : t('actionFailed'));
      } finally {
        setBusyIds((s) => {
          const next = new Set(s);
          next.delete(userId);
          return next;
        });
      }
    },
    [t, loadUsers],
  );

  const disableUser = useCallback(
    (id: string) => runAction(id, () => apiRequest(`/api/admin/users/${id}/disable`, { method: 'POST' })),
    [runAction],
  );

  const enableUser = useCallback(
    (id: string) => runAction(id, () => apiRequest(`/api/admin/users/${id}/enable`, { method: 'POST' })),
    [runAction],
  );

  return {
    users,
    loading,
    error,
    actionError,
    total,
    totalPages,
    busyIds,
    loadUsers,
    disableUser,
    enableUser,
  };
}
