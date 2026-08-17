/**
 * @file 用户管理子面板 — 从 community-admin-panel 拆出（GENERAL 2.4 按关注点拆分）
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Badge, Button, Pagination, SectionLoading } from '@/components';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { useConfirm } from '@/components/primitives/confirm-dialog';
import { formatDateTime } from '@/shared/utils/utils';
import { getError } from './community-admin-utils';

interface AdminUserItem {
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
  const t = useTranslations('userList');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search.trim()) params.set('search', search.trim());
      const res = await fetch(`/api/admin/users?${params}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(getError(data, t('loadFailed')));
      }
      const data = (await res.json()) as UsersResponse;
      setUsers(data.users ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loadFailed'));
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
      if (!res.ok) throw new Error(getError(data, t('actionFailed')));
      await loadUsers();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('actionFailed'));
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
        title: t('muteTitle'),
        message: t('muteMessage', { name: user.displayName ?? user.email }),
        variant: 'danger',
        confirmLabel: t('muteConfirm'),
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

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="px-4 py-3 border border-[var(--destructive)] bg-[var(--destructive)]/5 meta-mono text-[var(--destructive)]">
          {actionError}
        </div>
      )}

      <div className="border border-[var(--border)] p-4 sm:p-6 space-y-4">
        <div>
          <label className="meta-mono text-[10px] mb-1.5 block text-[var(--muted-foreground)]">{t('search')}</label>
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={t('searchPlaceholder')}
            maxLength={80}
            className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
          />
        </div>
      </div>

      <div className="meta-mono text-[var(--muted-foreground)]">
        {loading ? t('loading') : error ? <span className="text-[var(--destructive)]">{'// '}{error}</span> : <>{t('countPrefix')}<span className="text-[var(--foreground)] tabular-nums">{total}</span>{t('countSuffix')}</>}
      </div>

      {loading ? (
        <SectionLoading label="Loading..." />
      ) : error ? (
        <div className="py-12 text-center meta-mono text-[var(--destructive)]">{error}</div>
      ) : users.length === 0 ? (
        <div className="py-12 text-center meta-mono text-[var(--muted-foreground)]">{'// '}{t('noUsers')}</div>
      ) : (
        <div className="border-t border-[var(--border)]">
          <div className="hidden lg:grid grid-cols-12 gap-3 py-3 border-b border-[var(--border)] meta-mono text-[10px] text-[var(--muted-foreground)]">
            <div className="col-span-3">{t('colUser')} / User</div>
            <div className="col-span-2">{t('colEmail')} / Email</div>
            <div className="col-span-1">{t('colRole')} / Role</div>
            <div className="col-span-1">{t('colStatus')} / Status</div>
            <div className="col-span-2">{t('colCreated')} / Created</div>
            <div className="col-span-3 text-right">{t('colActions')} / Actions</div>
          </div>
          {users.map((user) => {
            const busy = busyIds.has(user.id);
            return (
              <div key={user.id} className="grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-3 py-4 border-b border-[var(--border)] items-center">
                <div className="lg:col-span-3">
                  <span className="font-mono text-[13px] text-[var(--foreground)]">{user.displayName ?? t('unnamed')}</span>
                </div>
                <div className="lg:col-span-2">
                  <span className="font-mono text-[12px] text-[var(--muted-foreground)] truncate block">{user.email}</span>
                </div>
                <div className="lg:col-span-1">
                  <Badge variant={user.role === 'root' ? 'danger' : user.role === 'admin' ? 'primary' : 'muted'}>
                    {user.role === 'root' ? 'ROOT' : user.role === 'admin' ? 'ADMIN' : 'USER'}
                  </Badge>
                </div>
                <div className="lg:col-span-1">
                  <Badge variant={user.isActive ? 'muted' : 'danger'}>
                    {user.isActive ? 'ACTIVE' : 'MUTED'}
                  </Badge>
                </div>
                <div className="lg:col-span-2 meta-mono text-[10px] text-[var(--muted-foreground)]">{formatDateTime(user.createdAt)}</div>
                <div className="lg:col-span-3 flex flex-wrap gap-1.5 lg:justify-end">
                  {user.isActive ? (
                    <Button variant="outline-danger" size="sm" type="button" onClick={() => handleDisable(user)} disabled={busy}>
                      {t('mute')} / Mute
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" type="button" onClick={() => handleEnable(user)} disabled={busy}>
                      {t('enable')} / Enable
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  );
}
