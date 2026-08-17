/**
 * @file 举报处理子面板 — 从 community-admin-panel 拆出（GENERAL 2.4 按关注点拆分）
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useConfirm } from '@/components/primitives/confirm-dialog';
import { Button } from '@/components';
import { formatDateTime } from '@/shared/utils/utils';
import { getError } from './community-admin-utils';

type ReportStatusFilter = 'pending' | 'resolved' | 'dismissed' | 'all';

interface ReportRow {
  id: string;
  reporterName: string | null;
  targetType: 'topic' | 'comment';
  targetId: string;
  reason: string;
  detail: string | null;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: string;
}

interface ReportsResponse {
  items: ReportRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const REPORT_STATUS_FILTERS: { value: ReportStatusFilter; label: string }[] = [
  { value: 'pending', label: '待处理 / Pending' },
  { value: 'resolved', label: '已处理 / Resolved' },
  { value: 'dismissed', label: '已驳回 / Dismissed' },
  { value: 'all', label: '全部 / All' },
];

/** 举报处理 — 处理/驳回举报 */
export function ReportsManager() {
  const [statusFilter, setStatusFilter] = useState<ReportStatusFilter>('pending');
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState<string | null>(null);

  const { confirm } = useConfirm();
  const t = useTranslations('reportsManager');
  const tf = useTranslations('community');
  const tc = useTranslations('communityAdmin');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      const res = await fetch(`/api/admin/community/reports?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(getError(data, tc('loadFailed')));
      }
      const data = (await res.json()) as ReportsResponse;
      setReports(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : tc('loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAction = async (id: string, action: 'resolve' | 'dismiss') => {
    setActionError(null);
    const ok = action === 'resolve'
      ? await confirm({ title: t('resolveTitle'), message: '确认将该举报标记为已处理？内容处置请另行执行。', confirmLabel: t('confirm') })
      : await confirm({ title: t('dismissTitle'), message: '确认驳回该举报（认定无违规）？', confirmLabel: t('confirm') });
    if (!ok) return;
    setBusyIds((s) => new Set(s).add(id));
    try {
      const res = await fetch(`/api/admin/community/reports/${id}?action=${action}`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(getError(data, tc('actionFailed')));
      }
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : tc('actionFailed'));
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  };

  return (
    <div>
      {/* 状态过滤 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {REPORT_STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setStatusFilter(f.value)}
            className={`focus-amber meta-mono text-[12px] px-3 py-1.5 border transition-colors ${
              statusFilter === f.value
                ? 'border-[var(--primary)] text-[var(--primary)]'
                : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="mb-4 p-3 border-l-2 border-[var(--destructive)] text-[var(--destructive)] meta-mono text-[12px]">
          {actionError}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center meta-mono text-[var(--muted-foreground)]">Loading...</div>
      ) : error ? (
        <div className="py-12 text-center meta-mono text-[var(--destructive)]">{error}</div>
      ) : reports.length === 0 ? (
        <div className="py-12 text-center meta-mono text-[var(--muted-foreground)]">[ No Record ]</div>
      ) : (
        <ul className="border-t border-[var(--border)]">
          {reports.map((r, idx) => (
            <li key={r.id} className={`py-5 ${idx < reports.length - 1 ? 'border-b border-[var(--border)]' : ''}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-2 meta-mono text-[11px] text-[var(--muted-foreground)]">
                    <span className="text-[var(--primary)]">{r.targetType === 'topic' ? t('targetTopic') : t('targetReply')}</span>
                    <span>·</span>
                    <span>{t('reporter')}：{r.reporterName ?? tf('anonymous')}</span>
                    <span>·</span>
                    <span>{formatDateTime(r.createdAt)}</span>
                  </div>
                  <div className="text-[14px] text-[var(--foreground)] mb-1">{t('reason')}：{r.reason}</div>
                  {r.detail && (
                    <div className="text-[12px] text-[var(--muted-foreground)] leading-relaxed">{r.detail}</div>
                  )}
                  <Link href={`/community/${r.targetId}`} className="inline-block mt-2 meta-mono text-[11px] text-[var(--primary)] underline-grow">
                    {t('viewContent')}
                  </Link>
                </div>
                {r.status === 'pending' && (
                  <div className="flex items-center gap-2 shrink-0">
                  <Button variant="outline" size="sm" type="button" disabled={busyIds.has(r.id)} onClick={() => handleAction(r.id, 'resolve')}>
                    {busyIds.has(r.id) ? '...' : t('resolveBtn')}
                  </Button>
                  <Button variant="outline-danger" size="sm" type="button" disabled={busyIds.has(r.id)} onClick={() => handleAction(r.id, 'dismiss')}>
                    {busyIds.has(r.id) ? '...' : t('dismissBtn')}
                  </Button>
                  </div>
                )}
                {r.status !== 'pending' && (
                  <span className="meta-mono text-[10px] px-2 py-0.5 border border-[var(--border)] text-[var(--muted-foreground)] shrink-0">
                    {r.status === 'resolved' ? t('statusResolvedLabel') : t('statusDismissedLabel')}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
