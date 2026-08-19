'use client';

/**
 * @file useUserResets — 管理员密码重置申请 Hook（从 use-admin-users 拆出，GENERAL 2.4）
 *
 * 专注密码重置申请列表：状态筛选 / 加载 / 拉取。
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/shared/hooks/use-api-request';
import type { PasswordResetRequest } from '@/modules/admin/ui/types';
import type { ResetStatusFilter } from './users-panel-utils';

export function useUserResets(onForbidden: () => void) {
  const router = useRouter();

  const [resetRequests, setResetRequests] = useState<PasswordResetRequest[]>([]);
  const [resetStatusFilter, setResetStatusFilter] = useState<ResetStatusFilter>('pending');
  const [resetListLoading, setResetListLoading] = useState(false);
  const [resetListError, setResetListError] = useState<string | null>(null);

  const fetchPasswordResets = useCallback(
    async (status?: ResetStatusFilter) => {
      const s = status ?? resetStatusFilter;
      setResetListLoading(true);
      setResetListError(null);
      try {
        const params = new URLSearchParams();
        if (s !== 'all') params.set('status', s);
        const r = await apiRequest<{ requests: PasswordResetRequest[] }>(
          `/api/admin/password-resets?${params.toString()}`,
          { cache: 'no-store' },
        );
        if (r.status === 401) {
          router.replace('/login');
          return;
        }
        if (r.status === 403) {
          onForbidden();
          return;
        }
        if (!r.ok) {
          throw new Error(r.error ?? '加载失败');
        }
        setResetRequests(r.data?.requests ?? []);
      } catch (err) {
        setResetListError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setResetListLoading(false);
      }
    },
    [resetStatusFilter, router, onForbidden],
  );

  return {
    resetRequests,
    setResetRequests,
    resetStatusFilter,
    setResetStatusFilter,
    resetListLoading,
    resetListError,
    fetchPasswordResets,
  };
}
