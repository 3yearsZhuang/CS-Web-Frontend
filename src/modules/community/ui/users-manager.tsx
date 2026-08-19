/**
 * @file 用户管理子面板 — 从 community-admin-panel 拆出（GENERAL 2.4 按关注点拆分）
 */
'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Badge, Button, Pagination, SectionLoading } from '@/components';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { useConfirm } from '@/components/primitives/confirm-dialog';
import { formatDateTime } from '@/shared/utils/utils';
import { useUsersManager, type AdminUserItem } from './use-users-manager';

/** 用户管理 — 搜索/禁言/解禁用户 */
export function UsersManager() {
  const { users, loading, error, actionError, total, totalPages, busyIds, loadUsers, disableUser, enableUser } =
    useUsersManager();
  const { confirm } = useConfirm();
  const t = useTranslations('userList');

  // 视图态（搜索/分页）
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    void loadUsers({ search, page });
  }, [loadUsers, search, page]);

  const handleDisable = (user: AdminUserItem) => {
    void (async () => {
      const confirmed = await confirm({
        title: t('muteTitle'),
        message: t('muteMessage', { name: user.displayName ?? user.email }),
        variant: 'danger',
        confirmLabel: t('muteConfirm'),
      });
      if (!confirmed) return;
      await disableUser(user.id);
    })();
  };

  const handleEnable = (user: AdminUserItem) => {
    void enableUser(user.id);
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
