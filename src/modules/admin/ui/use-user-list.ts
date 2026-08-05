'use client';

/**
 * @file useUserList — 管理员用户列表 Hook（从 use-admin-users 拆出，GENERAL 2.4）
 *
 * 专注用户列表数据：分页 / 搜索 / 角色筛选 / 启用状态筛选。
 * 暴露 setUsers / setTotal / setPage 供父级模态框操作后原地更新列表。
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PAGE_SIZE, type SafeUser, type UserListResult } from '@/modules/admin/ui/types';
import type { ActiveFilter, RoleFilter } from './users-panel-utils';

export function useUserList(currentUser: SafeUser, onForbidden: () => void) {
  const router = useRouter();

  // 列表数据
  const [users, setUsers] = useState<SafeUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  // 筛选 / 搜索
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('all');

  const fetchUsers = useCallback(
    async (opts?: { page?: number; search?: string; role?: RoleFilter; active?: ActiveFilter }) => {
      const p = opts?.page ?? page;
      const s = opts?.search ?? search;
      const r = opts?.role ?? roleFilter;
      const a = opts?.active ?? activeFilter;

      setListLoading(true);
      setListError(null);
      try {
        const params = new URLSearchParams({
          page: String(p),
          pageSize: String(PAGE_SIZE),
          role: r,
          active: a,
        });
        if (s) params.set('search', s);

        const res = await fetch(`/api/admin/users?${params.toString()}`, {
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

        const data = (await res.json()) as UserListResult;
        setUsers(data.users);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setPage(data.page);
      } catch (err) {
        setListError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setListLoading(false);
      }
    },
    [page, search, roleFilter, activeFilter, router, onForbidden],
  );

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    fetchUsers({ page: 1, search, role: roleFilter, active: activeFilter });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchUsers 已 useCallback 稳定化
  }, [search, roleFilter, activeFilter]);

  return {
    // 列表
    users,
    total,
    page,
    totalPages,
    setUsers,
    setTotal,
    setPage,
    searchInput,
    setSearchInput,
    roleFilter,
    setRoleFilter,
    activeFilter,
    setActiveFilter,
    listLoading,
    listError,
    fetchUsers,
  };
}
