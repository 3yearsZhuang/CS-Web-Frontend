/**
 * @file 密码重置申请子视图 — 从 admin-users-panel 拆出（GENERAL 2.4 按关注点拆分）
 */
'use client';

import { RevealItem } from '@/components/effects/motion-primitives';
import { Button, SectionLoading } from '@/components';
import { useTranslations } from 'next-intl';
import type { PasswordResetRequest } from '@/modules/admin/ui/types';
import { formatDate } from '@/shared/utils/utils';
import { resetStatusLabel, type ResetStatusFilter } from './users-panel-utils';

interface UserResetsViewProps {
  requests: PasswordResetRequest[];
  filter: ResetStatusFilter;
  setFilter: (v: ResetStatusFilter) => void;
  loading: boolean;
  error: string | null;
  onFetch: () => void;
  onApprove: (r: PasswordResetRequest) => void;
  onReject: (r: PasswordResetRequest) => void;
}

/** 密码重置申请子视图 */
export function UserResetsView({
  requests,
  filter,
  setFilter,
  loading,
  error,
  onFetch,
  onApprove,
  onReject,
}: UserResetsViewProps) {
  const t = useTranslations('adminJoin');
  return (
    <>
      {/* 工具栏：状态筛选 */}
      <RevealItem>
        <div className="border-t border-[var(--border)] border-b border-[var(--border)] py-5 sm:py-6 mb-0">
          <div className="grid grid-cols-12 gap-4 sm:gap-6 items-center">
            <div className="col-span-12 md:col-span-8">
              <div className="meta-mono mb-2 text-[var(--muted-foreground)]">{t('statusFilterLabel')}</div>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { v: 'pending', label: 'resetPending' },
                    { v: 'approved', label: 'resetApproved' },
                    { v: 'rejected', label: 'resetRejected' },
                    { v: 'all', label: 'resetAll' },
                  ] as { v: ResetStatusFilter; label: string }[]
                ).map((s) => (
                  <button
                    key={s.v}
                    type="button"
                    onClick={() => setFilter(s.v)}
                    className={`focus-amber px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider border transition-colors ${
                      filter === s.v
                        ? 'border-[var(--primary)] bg-[var(--primary)]/[0.08] text-[var(--primary)]'
                        : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/60 hover:text-[var(--foreground)]'
                    }`}
                  >
                    {t(s.label)}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-12 md:col-span-4 flex md:justify-end">
              <button
                type="button"
                onClick={onFetch}
                disabled={loading}
                className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow disabled:opacity-30"
              >
                {loading ? 'Loading' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </RevealItem>

      {/* 列表区 */}
      <RevealItem>
        {error && (
          <div className="p-4 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono leading-relaxed text-[var(--destructive)]">
            [ Error ] {error}
            <button type="button" onClick={onFetch} className="focus-amber ml-3 underline hover:opacity-80">
              {t('retry')}
            </button>
          </div>
        )}

        {loading && requests.length === 0 && (
          <div className="py-20 flex items-center justify-center">
            <SectionLoading label={t('loadingResetsLabel')} />
          </div>
        )}

        {!loading && !error && requests.length === 0 && (
          <div className="py-20 text-center">
            <div className="meta-mono text-[var(--muted-foreground)] mb-4">{t('noResets')}</div>
            <p className="text-[14px] text-[var(--muted-foreground)]">{t('noResetsDesc')}</p>
          </div>
        )}

        {/* 桌面表格（md+） */}
        {!error && requests.length > 0 && (
          <div className="hidden md:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left meta-mono py-3 pr-4 w-[28%]">Email</th>
                  <th className="text-left meta-mono py-3 pr-4">Status</th>
                  <th className="text-left meta-mono py-3 pr-4">Created</th>
                  <th className="text-left meta-mono py-3 pr-4">Resolved</th>
                  <th className="text-left meta-mono py-3 pr-4">Note</th>
                  <th className="text-right meta-mono py-3 pl-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => (
                  <tr key={r.id} className="border-b border-[var(--border)] card-minimal align-middle">
                    <td className="py-4 pr-4">
                      <div className="text-[14px] text-[var(--foreground)] truncate font-mono break-all">{r.email}</div>
                    </td>
                    <td className="py-4 pr-4">
                      <span className={`meta-mono ${r.status === 'pending' ? 'text-[var(--primary)]' : r.status === 'approved' ? 'text-[var(--foreground)]' : 'text-[var(--destructive)]'}`}>
                        {r.status === 'pending' ? '● Pending' : r.status === 'approved' ? '● Approved' : '● Rejected'}
                      </span>
                    </td>
                    <td className="py-4 pr-4 meta-mono">{formatDate(r.created_at)}</td>
                    <td className="py-4 pr-4 meta-mono">{r.resolved_at ? formatDate(r.resolved_at) : '—'}</td>
                    <td className="py-4 pr-4">
                      <span className="meta-mono text-[var(--muted-foreground)] break-all">{r.admin_note || '—'}</span>
                    </td>
                    <td className="py-4 pl-4">
                      <div className="flex items-center justify-end gap-2">
                        {r.status === 'pending' ? (
                          <>
                            <Button size="sm" onClick={() => onApprove(r)}>{t('approveAndResetBtn')}</Button>
                            <Button variant="outline" size="sm" onClick={() => onReject(r)} className="hover:text-[var(--destructive)] hover:border-[var(--destructive)]/60">
                              {t('reject')}
                            </Button>
                          </>
                        ) : (
                          <span className="meta-mono text-[var(--muted-foreground)]">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 移动端卡片列表（< md） */}
        {!error && requests.length > 0 && (
          <div className="md:hidden divide-y divide-[var(--border)] border-t border-[var(--border)]">
            {requests.map((r) => (
              <div key={r.id} className="p-4 card-minimal">
                <div className="text-[14px] text-[var(--foreground)] truncate font-mono break-all mb-3">{r.email}</div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <div className="meta-mono text-[var(--muted-foreground)]">{t('mobileStatusLabel')}</div>
                    <div className={`meta-mono mt-1 ${r.status === 'pending' ? 'text-[var(--primary)]' : r.status === 'approved' ? 'text-[var(--foreground)]' : 'text-[var(--destructive)]'}`}>
                      {resetStatusLabel(r.status)}
                    </div>
                  </div>
                  <div>
                    <div className="meta-mono text-[var(--muted-foreground)]">{t('mobileCreatedLabel')}</div>
                    <div className="meta-mono mt-1 text-[var(--foreground)]">{formatDate(r.created_at)}</div>
                  </div>
                  <div>
                    <div className="meta-mono text-[var(--muted-foreground)]">{t('mobileResolvedLabel')}</div>
                    <div className="meta-mono mt-1 text-[var(--foreground)]">{r.resolved_at ? formatDate(r.resolved_at) : '—'}</div>
                  </div>
                  <div>
                    <div className="meta-mono text-[var(--muted-foreground)]">{t('mobileNoteLabel')}</div>
                    <div className="meta-mono mt-1 text-[var(--foreground)] break-all">{r.admin_note || '—'}</div>
                  </div>
                </div>
                {r.status === 'pending' && (
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => onApprove(r)} className="flex-1">{t('approveAndResetBtn')}</Button>
                    <Button variant="outline" size="sm" onClick={() => onReject(r)} className="flex-1 hover:text-[var(--destructive)] hover:border-[var(--destructive)]/60">
                      {t('reject')}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </RevealItem>
    </>
  );
}
