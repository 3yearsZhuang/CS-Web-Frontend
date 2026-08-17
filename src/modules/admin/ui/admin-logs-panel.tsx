/**
 * @file 管理员审计日志面板 — 仅 root 可访问，支持筛选/删除单条/批量删除
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, SectionLoading } from '@/components';
import { RevealItem } from '@/components/effects/motion-primitives';
import { useToast } from '@/components/feedback/toast';
import { ModalShell, Field } from '@/modules/admin/ui/shared';
import { ConfirmDialog } from '@/components/primitives/confirm-dialog';
import { type AdminAction } from '@/modules/admin/ui/types';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { formatDate } from '@/shared/utils/utils';
import { describeAction, formatAdminName } from './logs-utils';
import { ACTION_FILTERS, LOGS_LIMIT, type LogModal } from './logs-types';

/* ============= 面板组件 ============= */

interface AdminLogsPanelProps {
  onForbidden: () => void;
}

/** 管理员审计日志面板（仅 root）— 按操作类型筛选日志，支持单条删除和批量删除 */
export function AdminLogsPanel({ onForbidden }: AdminLogsPanelProps) {
  const router = useRouter();
  const t = useTranslations('adminLogs');
  const { pushToast } = useToast();

  // 列表
  const [logs, setLogs] = useState<AdminAction[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [logsActionFilter, setLogsActionFilter] = useState<string>('');

  // 模态框
  const [modal, setModal] = useState<LogModal>({ type: 'none' });
  const [logDeleteSaving, setLogDeleteSaving] = useState(false);
  const [logDeleteError, setLogDeleteError] = useState<string | null>(null);
  // 批量删除：天数（删除早于 N 天前的日志）
  const [batchDeleteDays, setBatchDeleteDays] = useState<string>('30');

  /* ============= 数据获取 ============= */

  /** 拉取审计日志（GET /api/admin/actions）— 仅 root 可访问 */
  const fetchLogs = useCallback(
    async (action?: string) => {
      setLogsLoading(true);
      setLogsError(null);
      try {
        const params = new URLSearchParams({ limit: String(LOGS_LIMIT) });
        if (action) params.set('action', action);
        const res = await fetch(`/api/admin/actions?${params.toString()}`, {
          cache: 'no-store',
        });
        if (res.status === 401) {
          router.replace('/login');
          return;
        }
        if (res.status === 403) {
          // 非 root — 静默返回
          onForbidden();
          return;
        }
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error || t('loadFailed'));
        }
        const data = (await res.json()) as { actions?: AdminAction[] };
        setLogs(data.actions ?? []);
      } catch (err) {
        setLogsError(err instanceof Error ? err.message : t('loadFailed'));
      } finally {
        setLogsLoading(false);
      }
    },
    [router, onForbidden],
  );

  /* ============= 副作用 ============= */

  // 挂载时拉取一次日志
  useEffect(() => {
    fetchLogs(logsActionFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchLogs 已 useCallback 稳定化
  }, []);

  /* ============= 删除操作 ============= */

  /** 关闭模态框并清空错误 */
  const closeModal = () => {
    setModal({ type: 'none' });
    setLogDeleteError(null);
  };

  /** 单条日志删除 */
  const handleLogDelete = async () => {
    if (modal.type !== 'logDelete') return;
    const target = modal.action;

    setLogDeleteSaving(true);
    setLogDeleteError(null);
    try {
      const res = await fetch(`/api/admin/actions/${target.id}`, { method: 'DELETE' });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok || !data?.ok) {
        setLogDeleteError(data?.error || t('deleteFailed'));
        return;
      }
      pushToast('success', t('logDeleted'));
      setLogs((prev) => prev.filter((x) => x.id !== target.id));
      closeModal();
    } catch {
      setLogDeleteError(t('networkError'));
    } finally {
      setLogDeleteSaving(false);
    }
  };

  /** 批量删除早于 N 天的日志 */
  const handleLogBatchDelete = async () => {
    setLogDeleteSaving(true);
    setLogDeleteError(null);
    try {
      const days = parseInt(batchDeleteDays, 10);
      if (!Number.isFinite(days) || days <= 0) {
        setLogDeleteError(t('invalidDays'));
        return;
      }
      const before = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch('/api/admin/actions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ before }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; count?: number; error?: string }
        | null;
      if (!res.ok || !data?.ok) {
        setLogDeleteError(data?.error || t('batchDeleteFailed'));
        return;
      }
      pushToast('success', t('batchDeleted', { count: data.count ?? 0 }));
      closeModal();
      fetchLogs(logsActionFilter);
    } catch {
      setLogDeleteError(t('networkError'));
    } finally {
      setLogDeleteSaving(false);
    }
  };

  /* ============= 渲染 ============= */

  return (
    <>
      {/* 工具栏：action 筛选 + 批量删除 */}
      <RevealItem>
        <div className="border-t border-b border-[var(--border)] py-5 sm:py-6 mb-0">
          <div className="grid grid-cols-12 gap-4 sm:gap-6 items-center">
            <div className="col-span-12 md:col-span-7">
              <div className="meta-mono mb-2 text-[var(--muted-foreground)]">
                {t('actionFilterLabel')}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ACTION_FILTERS.map((s) => (
                  <button
                    key={s.v}
                    type="button"
                    onClick={() => {
                      setLogsActionFilter(s.v);
                      fetchLogs(s.v);
                    }}
                    className={`tab-chip focus-ring ${logsActionFilter === s.v ? 'tab-chip-active' : ''}`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="col-span-12 md:col-span-5 flex md:justify-end items-end gap-3">
              <button
                type="button"
                onClick={() => fetchLogs(logsActionFilter)}
                disabled={logsLoading}
                className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] underline-grow disabled:opacity-30"
              >
                {logsLoading ? 'Loading' : 'Refresh'}
              </button>
              <button
                type="button"
                onClick={() => setModal({ type: 'logDeleteBatch' })}
                className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--destructive)] underline-grow"
              >
                {t('batchDeleteBtn')}
              </button>
            </div>
          </div>
          {logsError && (
            <div className="mt-4 p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)]">
              [ Error ] {logsError}
            </div>
          )}
        </div>
      </RevealItem>

      {/* 列表区 */}
      <RevealItem>
        {/* 加载中 */}
        {logsLoading && logs.length === 0 && (
          <div className="py-20 flex items-center justify-center">
            <SectionLoading label={t('loadingLogsLabel')} />
          </div>
        )}

        {/* 空状态 */}
        {!logsLoading && !logsError && logs.length === 0 && (
          <div className="py-20 text-center">
            <div className="meta-mono text-[var(--muted-foreground)] mb-4">{t('noLogs')}</div>
            <p className="text-[14px] text-[var(--muted-foreground)]">{t('noLogsDesc')}</p>
          </div>
        )}

        {/* 桌面表格（md+） */}
        {!logsError && logs.length > 0 && (
          <div className="hidden md:block">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left meta-mono py-3 pr-4 w-[18%]">{t('colTime')}</th>
                  <th className="text-left meta-mono py-3 pr-4 w-[44%]">{t('colDescription')}</th>
                  <th className="text-left meta-mono py-3 pr-4 w-[20%]">{t('colAdmin')}</th>
                  <th className="text-right meta-mono py-3 pl-4 w-[8%]">{t('colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-[var(--border)] hover:bg-[var(--foreground)]/[0.02]">
                    <td className="py-4 pr-4 meta-mono text-[11px] text-[var(--muted-foreground)]">
                      {formatDate(log.createdAt)}
                      <div className="text-[10px] opacity-60 mt-0.5">
                        {new Date(log.createdAt).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="text-[12px] text-[var(--foreground)] leading-relaxed">
                        {describeAction(log)}
                      </div>
                      <div className="meta-mono text-[10px] text-[var(--muted-foreground)] mt-1">
                        [{log.action}]{' '}
                        {log.details
                          ? ` — ${log.details.slice(0, 120)}${log.details.length > 120 ? '…' : ''}`
                          : ''}
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <span className="meta-mono text-[11px] text-[var(--foreground)]" title={log.adminId ?? undefined}>
                        {formatAdminName(log)}
                      </span>
                    </td>
                    <td className="py-4 pl-4 text-right">
                      <button
                        type="button"
                        onClick={() => setModal({ type: 'logDelete', action: log })}
                        className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--destructive)] underline-grow"
                      >
                        {t('deleteBtn')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 移动端卡片列表（< md） */}
        {!logsError && logs.length > 0 && (
          <div className="md:hidden divide-y divide-[var(--border)] border-t border-[var(--border)]">
            {logs.map((log) => (
              <div key={log.id} className="p-4 card-minimal">
                <div className="text-[12px] text-[var(--foreground)] leading-relaxed mb-2">
                  {describeAction(log)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                    {formatDate(log.createdAt)}
                  </span>
                  <span className="meta-mono text-[10px] text-[var(--foreground)]">
                    {formatAdminName(log)}
                  </span>
                </div>
                <div className="meta-mono text-[10px] text-[var(--muted-foreground)] mt-1">
                  [{log.action}]{' '}
                  {log.details
                    ? ` — ${log.details.slice(0, 80)}${log.details.length > 80 ? '…' : ''}`
                    : ''}
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setModal({ type: 'logDelete', action: log })}
                    className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--destructive)] underline-grow"
                  >
                    {t('deleteBtn')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </RevealItem>

      {/* ============ 模态框：删除单条日志 ============ */}
      <ConfirmDialog
        open={modal.type === 'logDelete'}
        title={t('deleteTitle')}
        message={t('deleteMessage')}
        variant="danger"
        confirmLabel={logDeleteSaving ? t('deleting') : t('confirmDelete')}
        loading={logDeleteSaving}
        onConfirm={handleLogDelete}
        onCancel={closeModal}
      >
        {modal.type === 'logDelete' && (
          <>
            <div className="p-3 border border-[var(--border)] bg-[var(--muted)]/[0.3]">
              <div className="flex items-center gap-2 mb-1">
                <span className="meta-mono text-[var(--primary)]">{modal.action.action}</span>
                <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                  {formatDate(modal.action.createdAt)}
                </span>
              </div>
              {modal.action.details && (
                <div className="meta-mono text-[11px] text-[var(--muted-foreground)] break-all">
                  {modal.action.details}
                </div>
              )}
            </div>
            {logDeleteError && (
              <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)]">
                {logDeleteError}
              </div>
            )}
          </>
        )}
      </ConfirmDialog>

      {/* ============ 模态框：批量删除日志 ============ */}
      {modal.type === 'logDeleteBatch' && (
        <ModalShell title={t('batchDeleteTitle')} onClose={closeModal}>
          <div className="space-y-6">
            <p className="text-[14px] text-[var(--foreground)] leading-relaxed">
              {t('batchDeleteDesc')}
            </p>
            <Field label={t('keepDaysLabel')}>
              <input
                type="number"
                min={1}
                value={batchDeleteDays}
                onChange={(e) => setBatchDeleteDays(e.target.value)}
                className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
                placeholder="30"
              />
            </Field>
            <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[11px] font-mono leading-relaxed text-[var(--destructive)]">
              {t('batchDeleteWarning', { days: batchDeleteDays || '30' })}
            </div>

            {logDeleteError && (
              <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)]">
                {logDeleteError}
              </div>
            )}

            <div className="flex items-center gap-4 pt-2">
              <Button
                variant="danger"
                type="button"
                disabled={logDeleteSaving}
                loading={logDeleteSaving}
                onClick={handleLogBatchDelete}
              >
                {logDeleteSaving ? t('deletingLabel') : t('confirmBatchDelete')}
              </Button>
              <button
                type="button"
                onClick={closeModal}
                className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline-grow"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </>
  );
}
