'use client';

/**
 * @file useUserResets — 管理员密码重置申请 Hook（从 use-admin-users 拆出，GENERAL 2.4）
 *
 * 专注密码重置申请列表：状态筛选 / 加载 / 拉取。
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
        const res = await fetch(`/api/admin/password-resets?${params.toString()}`, {
          cache: 'no-store',
        });
        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        if (res.status === 403) {
          onForbidden();
          return;
        }
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error || '加载失败');
        }
        const data = (await res.json()) as { requests: PasswordResetRequest[] };
        setResetRequests(data.requests ?? []);
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
