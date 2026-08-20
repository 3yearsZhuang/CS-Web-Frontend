/**
 * @file 用户列表子视图 — 从 admin-users-panel 拆出（GENERAL 2.4 按关注点拆分）
 * 工具栏（角色/状态筛选）+ 用户表格/卡片 + 分页（搜索已聚合至顶栏，2026-08-20）
 */
'use client';

import { RevealItem } from '@/components/effects/motion-primitives';
import { Avatar } from '@/components/avatar';
import { SectionLoading, Pagination } from '@/components';
import { useTranslations } from 'next-intl';
import type { SafeUser } from '@/modules/admin/ui/types';
import { formatDate } from '@/shared/utils/utils';
import { roleLabel } from './users-panel-utils';
import type { ActiveFilter, RoleFilter } from './users-panel-utils';

interface UserListViewProps {
  users: SafeUser[];
  total: number;
  page: number;
  totalPages: number;
  roleFilter: RoleFilter;
  setRoleFilter: (v: RoleFilter) => void;
  activeFilter: ActiveFilter;
  setActiveFilter: (v: ActiveFilter) => void;
  listLoading: boolean;
  listError: string | null;
  isSelf: (u: SafeUser) => boolean;
  isRootTarget: (u: SafeUser) => boolean;
  isRootAdmin: boolean;
  isForbiddenForAdmin: (u: SafeUser) => boolean;
  onFetch: (opts?: { page?: number }) => void;
  onEdit: (u: SafeUser) => void;
  onReset: (u: SafeUser) => void;
  onResetDefault: (u: SafeUser) => void;
  onDelete: (u: SafeUser) => void;
  onDisable: (u: SafeUser) => void;
}

/** 用户列表子视图 */
export function UserListView({
  users,
  total,
  page,
  totalPages,
  roleFilter,
  setRoleFilter,
  activeFilter,
  setActiveFilter,
  listLoading,
  listError,
  isSelf,
  isRootTarget,
  isRootAdmin,
  isForbiddenForAdmin,
  onFetch,
  onEdit,
  onReset,
  onResetDefault,
  onDelete,
  onDisable,
}: UserListViewProps) {
  const t = useTranslations('userList');
  return (
    <>
      {/* 工具栏 */}
      <RevealItem>
        <div className="border-t border-[var(--border)] border-b border-[var(--border)] py-5 sm:py-6 mb-0">
          <div className="grid grid-cols-12 gap-4 sm:gap-6 items-center">
            <div className="col-span-6 md:col-span-5">
              <div className="meta-mono mb-2 text-[var(--muted-foreground)]">{t('role')}</div>
              <div className="flex gap-1.5">
                {(['all', 'admin', 'user'] as RoleFilter[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRoleFilter(r)}
                    className={`tab-chip focus-ring ${roleFilter === r ? 'tab-chip-active' : ''}`}
                  >
                    {r === 'all' ? t('all') : r === 'admin' ? t('admin') : t('user')}
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-6 md:col-span-5">
              <div className="meta-mono mb-2 text-[var(--muted-foreground)]">{t('status')}</div>
              <div className="flex gap-1.5">
                {(
                  [
                    { v: 'all', labelKey: 'all' },
                    { v: 'active', labelKey: 'active' },
                    { v: 'inactive', labelKey: 'inactive' },
                  ] as Array<{ v: ActiveFilter; labelKey: 'all' | 'active' | 'inactive' }>
                ).map((s) => (
                  <button
                    key={s.v}
                    type="button"
                    onClick={() => setActiveFilter(s.v)}
                    className={`tab-chip focus-ring ${activeFilter === s.v ? 'tab-chip-active' : ''}`}
                  >
                    {t(s.labelKey)}
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-12 md:col-span-2 flex md:justify-end">
              <button
                type="button"
                onClick={() => onFetch()}
                disabled={listLoading}
                className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow disabled:opacity-30"
              >
                {listLoading ? t('loading') : t('refresh')}
              </button>
            </div>
          </div>
        </div>
      </RevealItem>

      {/* 列表区 */}
      <RevealItem>
        {listError && (
          <div className="p-4 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono leading-relaxed text-[var(--destructive)]">
            [ Error ] {listError}
            <button type="button" onClick={() => onFetch()} className="focus-amber ml-3 underline hover:opacity-80">
              {t('retry')}
            </button>
          </div>
        )}

        {listLoading && users.length === 0 && (
          <div className="py-20 flex items-center justify-center">
            <SectionLoading label={t('loadingUsers')} />
          </div>
        )}

        {!listLoading && !listError && users.length === 0 && (
          <div className="py-20 text-center">
            <div className="meta-mono text-[var(--muted-foreground)] mb-4">{t('noRecord')}</div>
            <p className="text-[14px] text-[var(--muted-foreground)]">{t('noUsers')}</p>
          </div>
        )}

        {/* 桌面表格（md+） */}
        {!listError && users.length > 0 && (
          <div className="hidden md:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left meta-mono py-3 pr-4 w-[34%]">{t('colUser')}</th>
                  <th className="text-left meta-mono py-3 pr-4">{t('colRole')}</th>
                  <th className="text-left meta-mono py-3 pr-4">{t('colStatus')}</th>
                  <th className="text-left meta-mono py-3 pr-4">{t('colCreated')}</th>
                  <th className="text-right meta-mono py-3 pl-4">{t('colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const self = isSelf(u);
                  return (
                    <tr key={u.id} className="border-b border-[var(--border)] card-minimal align-middle">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <Avatar email={u.email} displayName={u.displayName} avatarUrl={u.avatarUrl} avatarType={u.avatarType} size={36} />
                          <div className="min-w-0">
                            <div className="text-[14px] text-[var(--foreground)] truncate font-mono">
                              {u.displayName || <span className="text-[var(--muted-foreground)]">{t('unnamed')}</span>}
                            </div>
                            <div className="meta-mono mt-0.5 truncate">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <span className={`meta-mono ${u.role === 'root' ? 'text-[var(--destructive)]' : u.role === 'admin' ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}`}>
                          {u.role === 'root' ? t('root') : u.role === 'admin' ? '● Admin' : '○ User'}
                        </span>
                      </td>
                      <td className="py-4 pr-4">
                        <span className={`meta-mono ${u.isActive ? 'text-[var(--foreground)]' : 'text-[var(--destructive)]'}`}>
                          {u.isActive ? t('activeLabel') : t('disabledLabel')}
                        </span>
                      </td>
                      <td className="py-4 pr-4 meta-mono">{formatDate(u.createdAt)}</td>
                      <td className="py-4 pl-4">
                        <div className="flex items-center justify-end gap-3">
                          {isRootTarget(u) ? (
                            <span className="meta-mono text-[var(--muted-foreground)]">{t('notOperable')}</span>
                          ) : isRootAdmin ? (
                            <>
                              <button type="button" disabled={self} onClick={() => onEdit(u)} className="focus-amber meta-mono text-[var(--foreground)] hover:text-[var(--primary)] underline-grow disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline" title={self ? t('cantEditSelf') : t('editRootOnly')}>
                                {t('edit')}
                              </button>
                              <button type="button" onClick={() => onReset(u)} className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow" title={t('resetRootOnly')}>
                                {t('resetPassword')}
                              </button>
                              <button type="button" disabled={self} onClick={() => onDelete(u)} className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--destructive)] underline-grow disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline" title={self ? t('cantDeleteSelf') : t('deleteRootOnly')}>
                                {t('delete')}
                              </button>
                              <button type="button" disabled={self} onClick={() => onDisable(u)} className={`focus-amber meta-mono underline-grow disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline ${u.isActive ? 'text-[var(--muted-foreground)] hover:text-[var(--destructive)]' : 'text-[var(--foreground)] hover:text-[var(--primary)]'}`} title={self ? t('cantDisableSelf') : u.isActive ? t('disable') : t('enable')}>
                                {u.isActive ? t('disable') : t('enable')}
                              </button>
                            </>
                          ) : isForbiddenForAdmin(u) ? (
                            <span className="meta-mono text-[var(--muted-foreground)]">{t('notOperable')}</span>
                          ) : (
                            <>
                              <button type="button" onClick={() => onResetDefault(u)} className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow" title={t('resetDefault')}>
                                {t('resetPassword')}
                              </button>
                              <button type="button" disabled={self} onClick={() => onDisable(u)} className={`focus-amber meta-mono underline-grow disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline ${u.isActive ? 'text-[var(--muted-foreground)] hover:text-[var(--destructive)]' : 'text-[var(--foreground)] hover:text-[var(--primary)]'}`} title={self ? t('cantDisableSelf') : u.isActive ? t('disable') : t('enable')}>
                                {u.isActive ? t('disable') : t('enable')}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 移动端卡片列表（< md） */}
        {!listError && users.length > 0 && (
          <div className="md:hidden divide-y divide-[var(--border)] border-t border-[var(--border)]">
            {users.map((u) => {
              const self = isSelf(u);
              return (
                <div key={u.id} className="p-4 card-minimal">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar email={u.email} displayName={u.displayName} avatarUrl={u.avatarUrl} avatarType={u.avatarType} size={40} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] text-[var(--foreground)] truncate font-mono">
                        {u.displayName || <span className="text-[var(--muted-foreground)]">{t('unnamed')}</span>}
                      </div>
                      <div className="meta-mono mt-0.5 truncate">{u.email}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div>
                      <div className="meta-mono text-[var(--muted-foreground)]">{t('colRole')}</div>
                      <div className={`meta-mono mt-1 ${u.role === 'root' ? 'text-[var(--destructive)]' : u.role === 'admin' ? 'text-[var(--primary)]' : 'text-[var(--foreground)]'}`}>{roleLabel(u.role)}</div>
                    </div>
                    <div>
                      <div className="meta-mono text-[var(--muted-foreground)]">{t('colStatus')}</div>
                      <div className={`meta-mono mt-1 ${u.isActive ? 'text-[var(--foreground)]' : 'text-[var(--destructive)]'}`}>{u.isActive ? t('enable') : t('disable')}</div>
                    </div>
                    <div>
                      <div className="meta-mono text-[var(--muted-foreground)]">{t('colCreated')}</div>
                      <div className="meta-mono mt-1 text-[var(--foreground)]">{formatDate(u.createdAt)}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
                    {isRootTarget(u) ? (
                      <span className="meta-mono text-[var(--muted-foreground)] ml-auto">{t('notOperable')}</span>
                    ) : isRootAdmin ? (
                      <>
                        <button type="button" disabled={self} onClick={() => onEdit(u)} className="focus-amber meta-mono text-[var(--foreground)] hover:text-[var(--primary)] underline-grow disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline">{t('edit')}</button>
                        <button type="button" onClick={() => onReset(u)} className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow">{t('resetPassword')}</button>
                        <button type="button" disabled={self} onClick={() => onDelete(u)} className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--destructive)] underline-grow disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline">{t('delete')}</button>
                        <button type="button" disabled={self} onClick={() => onDisable(u)} className={`focus-amber meta-mono underline-grow disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline ml-auto ${u.isActive ? 'text-[var(--muted-foreground)] hover:text-[var(--destructive)]' : 'text-[var(--foreground)] hover:text-[var(--primary)]'}`}>{u.isActive ? t('disable') : t('enable')}</button>
                      </>
                    ) : isForbiddenForAdmin(u) ? (
                      <span className="meta-mono text-[var(--muted-foreground)] ml-auto">{t('notOperable')}</span>
                    ) : (
                      <>
                        <button type="button" onClick={() => onResetDefault(u)} className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow">{t('resetPassword')}</button>
                        <button type="button" disabled={self} onClick={() => onDisable(u)} className={`focus-amber meta-mono underline-grow disabled:opacity-30 disabled:cursor-not-allowed disabled:no-underline ml-auto ${u.isActive ? 'text-[var(--muted-foreground)] hover:text-[var(--destructive)]' : 'text-[var(--foreground)] hover:text-[var(--primary)]'}`}>{u.isActive ? t('disable') : t('enable')}</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 分页 */}
        {!listError && users.length > 0 && (
          <div className="mt-6 flex items-center justify-between border-t border-[var(--border)] pt-5">
            <div className="meta-mono text-[var(--muted-foreground)]">
              {t('totalPages', { total, page, pages: Math.max(1, totalPages) })}
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={(p) => onFetch({ page: p })} />
          </div>
        )}
      </RevealItem>
    </>
  );
}
