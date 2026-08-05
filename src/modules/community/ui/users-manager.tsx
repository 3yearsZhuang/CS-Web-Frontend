/**
 * @file 用户管理子面板 — 从 forum-admin-panel 拆出（GENERAL 2.4 按关注点拆分）
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button, SectionLoading } from '@/components';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { useConfirm } from '@/components/primitives/confirm-dialog';
import { formatDateTime } from '@/shared/utils/utils';
import { getError } from './forum-admin-utils';

interface AdminUserItem {
  id: string;
  displayName: string | null;
  email: string;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: string;
}

interface UsersResponse {
  users: AdminUserItem[];
  total: number;
  page: number;
  totalPages: number;
}

/** 用户管理 — 搜索/禁言/解禁用户 */
export function UsersManager() {
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());

  const { confirm } = useConfirm();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(getError(data, '加载失败'));
      }
      const data = (await res.json()) as UsersResponse;
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  const doUserAction = async (userId: string, action: () => Promise<Response>) => {
    setActionError(null);
    setBusyIds((s) => new Set(s).add(userId));
    try {
      const res = await action();
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(getError(data, '操作失败'));
      await loadUsers();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleDisable = (user: AdminUserItem) => {
    void (async () => {
      const confirmed = await confirm({
        title: '禁言用户',
        message: `确认禁言「${user.displayName ?? user.email}」吗？\n禁言后该用户将无法发帖和回复。`,
        variant: 'danger',
        confirmLabel: '确认禁言',
      });
      if (!confirmed) return;
      doUserAction(user.id, () =>
        fetch(`/api/admin/users/${user.id}/disable`, { method: 'POST' }),
      );
    })();
  };

  const handleEnable = (user: AdminUserItem) => {
    void doUserAction(user.id, () =>
      fetch(`/api/admin/users/${user.id}/enable`, { method: 'POST' }),
    );
  };

  const pageNums = (() => {
    const max = totalPages;
    const cur = page;
    const range: number[] = [];
    const start = Math.max(1, Math.min(cur - 2, max - 4));
    const end = Math.min(max, start + 4);
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  })();

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="px-4 py-3 border border-[var(--destructive)] bg-[var(--destructive)]/5 meta-mono text-[var(--destructive)]">
          {actionError}
        </div>
      )}

      <div className="border border-[var(--border)] p-4 sm:p-6 space-y-4">
        <div>
          <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">搜索 / Search</label>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="搜索用户名或邮箱..."
            maxLength={80}
            className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
          />
        </div>
      </div>

      <div className="meta-mono text-[var(--muted-foreground)]">
        {loading ? '// 加载中...' : error ? <span className="text-[var(--destructive)]">{'// '}{error}</span> : <>{'// 共 '}<span className="text-[var(--foreground)] tabular-nums">{total}</span>{' 位用户'}</>}
      </div>

      {loading ? (
        <SectionLoading label="Loading..." />
      ) : error ? (
        <div className="py-12 text-center meta-mono text-[var(--destructive)]">{error}</div>
      ) : users.length === 0 ? (
        <div className="py-12 text-center meta-mono text-[var(--muted-foreground)]">{'// 暂无用户'}</div>
      ) : (
        <div className="border-t border-[var(--border)]">
          <div className="hidden lg:grid grid-cols-12 gap-3 py-3 border-b border-[var(--border)] meta-mono text-[10px] text-[var(--muted-foreground)]">
            <div className="col-span-3">用户 / User</div>
            <div className="col-span-2">邮箱 / Email</div>
            <div className="col-span-1">角色 / Role</div>
            <div className="col-span-1">状态 / Status</div>
            <div className="col-span-2">注册 / Created</div>
            <div className="col-span-3 text-right">操作 / Actions</div>
          </div>
          {users.map((user) => {
            const busy = busyIds.has(user.id);
            return (
              <div key={user.id} className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3 py-4 border-b border-[var(--border)] items-center">
                <div className="lg:col-span-3">
                  <span className="font-mono text-[13px] text-[var(--foreground)]">{user.displayName ?? '未命名用户'}</span>
                </div>
                <div className="lg:col-span-2">
                  <span className="font-mono text-[12px] text-[var(--muted-foreground)] truncate block">{user.email}</span>
                </div>
                <div className="lg:col-span-1">
                  <span className={`meta-mono text-[10px] px-2 py-0.5 border ${user.role === 'admin' ? 'border-[var(--primary)] text-[var(--primary)]' : 'border-[var(--border)] text-[var(--muted-foreground)]'}`}>
                    {user.role === 'admin' ? 'ADMIN' : 'USER'}
                  </span>
                </div>
                <div className="lg:col-span-1">
                  <span className={`meta-mono text-[10px] px-2 py-0.5 border ${user.isActive ? 'border-[var(--border)] text-[var(--muted-foreground)]' : 'border-[var(--destructive)] text-[var(--destructive)]'}`}>
                    {user.isActive ? 'ACTIVE' : 'MUTED'}
                  </span>
                </div>
                <div className="lg:col-span-2 meta-mono text-[10px] text-[var(--muted-foreground)]">{formatDateTime(user.createdAt)}</div>
                <div className="lg:col-span-3 flex flex-wrap gap-1.5 lg:justify-end">
                  {user.isActive ? (
                    <Button variant="outline" size="sm" type="button" onClick={() => handleDisable(user)} disabled={busy} className="hover:text-[var(--destructive)] hover:border-[var(--destructive)]">
                      禁言 / Mute
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" type="button" onClick={() => handleEnable(user)} disabled={busy}>
                      解禁 / Enable
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 py-6 border-t border-[var(--border)]">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="meta-mono px-3 py-1.5 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors disabled:opacity-30 focus-amber">←</button>
          {pageNums.map((n) => (
            <button key={n} onClick={() => setPage(n)} className={`font-mono text-[12px] px-3 py-1.5 border transition-colors focus-amber ${page === n ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/5' : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)]'}`}>
              {String(n).padStart(2, '0')}
            </button>
          ))}
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="meta-mono px-3 py-1.5 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors disabled:opacity-30 focus-amber">→</button>
        </div>
      )}
    </div>
  );
}
