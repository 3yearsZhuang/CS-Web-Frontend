/**
 * @file 管理端财务视图 — 总库/峰资金、发行回收与调拨、最近流水（统一账本）
 *
 * 数据全部走 /api/admin/finance/*；金额在 JSON 中是字符串，展示时转 number。
 * 权限由后端 finance:* + 峰范围校验，前端只做表单合法性检查。
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/feedback/toast';
import { Button, Spinner } from '@/components';
import { apiRequest } from '@/shared/hooks/use-api-request';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';

/* ============= 类型 ============= */

interface FinanceStats {
  treasury: string;
  peakTotal: string;
  userTotal: string;
  taskEscrowTotal: string;
  issuance: string;
  peakCount: number;
  userAccountCount: number;
}

interface TreasuryAccount {
  id: number;
  balance: string;
}

interface PeakRow {
  peakId: number;
  peakName: string;
  peakCode: string;
  accountId: number | null;
  balance: string;
  memberCount: number;
  isActive: boolean;
}

interface TxEntry {
  accountId: number;
  kind: string;
  ownerName?: string | null;
  peakName?: string | null;
  delta: string;
  balanceAfter: string;
}

interface TxRow {
  transactionId: number;
  type: string;
  reason?: string | null;
  actorName?: string | null;
  createdAt?: string | null;
  entries: TxEntry[];
}

type FundAction = 'issue' | 'burn' | 'allocate' | 'transfer' | 'return';

/* ============= 工具 ============= */

function money(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n.toLocaleString() : '0';
}

function entryLabel(entry: TxEntry): string {
  return entry.peakName || entry.ownerName || entry.kind;
}

/* ============= 组件 ============= */

export function AdminFinanceView() {
  const t = useTranslations('adminOps');
  const { pushToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [treasury, setTreasury] = useState<TreasuryAccount | null>(null);
  const [peaks, setPeaks] = useState<PeakRow[]>([]);
  const [txs, setTxs] = useState<TxRow[]>([]);

  const [action, setAction] = useState<FundAction>('issue');
  const [fromPeakId, setFromPeakId] = useState<number | ''>('');
  const [toPeakId, setToPeakId] = useState<number | ''>('');
  const [amountText, setAmountText] = useState('100');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [statsRes, treasuryRes, peaksRes, txRes] = await Promise.all([
      apiRequest<FinanceStats>('/api/admin/finance/stats', { cache: 'no-store' }),
      apiRequest<TreasuryAccount>('/api/admin/finance/treasury', { cache: 'no-store' }),
      apiRequest<{ items: PeakRow[] }>('/api/admin/finance/peaks?limit=200', { cache: 'no-store' }),
      apiRequest<{ items: TxRow[] }>('/api/admin/finance/transactions?limit=50', {
        cache: 'no-store',
      }),
    ]);
    setStats(statsRes.ok ? statsRes.data : null);
    setTreasury(treasuryRes.ok ? treasuryRes.data : null);
    setPeaks(peaksRes.ok ? peaksRes.data?.items ?? [] : []);
    setTxs(txRes.ok ? txRes.data?.items ?? [] : []);
    if (!statsRes.ok) {
      setError(statsRes.status === 403 ? t('permissionDenied') : statsRes.error || t('failed'));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = useCallback(async () => {
    setFormError(null);
    const amount = Number.parseInt(amountText, 10);
    if (!Number.isInteger(amount) || amount <= 0) {
      setFormError(t('invalidAmount'));
      return;
    }
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setFormError(t('reasonRequired'));
      return;
    }

    const fromPeak = peaks.find((p) => p.peakId === fromPeakId);
    const toPeak = peaks.find((p) => p.peakId === toPeakId);

    let result: Awaited<ReturnType<typeof apiRequest>>;
    if (action === 'issue' || action === 'burn') {
      if (!treasury) {
        setFormError(t('failed'));
        return;
      }
      result = await apiRequest('/api/admin/finance/adjustments', {
        method: 'POST',
        body: {
          targetAccountId: treasury.id,
          direction: action,
          amount: String(amount),
          reason: trimmedReason,
        },
      });
    } else if (action === 'allocate') {
      if (!treasury || !toPeak?.accountId) {
        setFormError(t('failed'));
        return;
      }
      result = await apiRequest('/api/admin/finance/allocations', {
        method: 'POST',
        body: {
          fromAccountId: treasury.id,
          toAccountId: toPeak.accountId,
          amount: String(amount),
          reason: trimmedReason,
          operationKind: 'allocation',
        },
      });
    } else if (action === 'return') {
      if (!treasury || !fromPeak?.accountId) {
        setFormError(t('failed'));
        return;
      }
      result = await apiRequest('/api/admin/finance/allocations', {
        method: 'POST',
        body: {
          fromAccountId: fromPeak.accountId,
          toAccountId: treasury.id,
          amount: String(amount),
          reason: trimmedReason,
          operationKind: 'return',
        },
      });
    } else {
      if (!fromPeak?.accountId || !toPeak?.accountId) {
        setFormError(t('failed'));
        return;
      }
      result = await apiRequest('/api/admin/finance/peak-transfers', {
        method: 'POST',
        body: {
          fromPeakId: fromPeak.peakId,
          toPeakId: toPeak.peakId,
          amount: String(amount),
          reason: trimmedReason,
        },
      });
    }

    if (!result.ok) {
      setFormError(result.error || t('failed'));
      return;
    }
    pushToast('success', t('success'));
    setReason('');
    await load();
  }, [action, amountText, fromPeakId, toPeakId, peaks, reason, treasury, t, load, pushToast]);

  const showFromPeak = action === 'return' || action === 'transfer';
  const showToPeak = action === 'allocate' || action === 'transfer';

  return (
    <>
      {/* 汇总 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-[var(--border)] border border-[var(--border)] mb-10">
        {[
          { label: t('treasury'), value: stats ? money(stats.treasury) : '—' },
          { label: t('peakTotal'), value: stats ? money(stats.peakTotal) : '—' },
          { label: t('userTotal'), value: stats ? money(stats.userTotal) : '—' },
          { label: t('escrow'), value: stats ? money(stats.taskEscrowTotal) : '—' },
          { label: t('issued'), value: stats ? money(stats.issuance) : '—' },
        ].map((item) => (
          <div key={item.label} className="bg-[var(--background)] p-5">
            <div className="meta-mono text-[10px] text-[var(--muted-foreground)]">{item.label}</div>
            <div className="mt-2 font-mono text-[20px] text-[var(--foreground)]">{item.value}</div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] font-mono text-[12px] text-[var(--destructive)]">
          {error}
        </div>
      )}

      {/* 资金操作 */}
      <section className="mb-12 border border-[var(--border)] p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="meta-mono text-[12px] text-[var(--foreground)]">[ {t('action')} ]</div>
          <button
            type="button"
            onClick={() => void load()}
            className="focus-amber meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline-grow"
          >
            {t('refresh')}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <div className="meta-mono mb-2 text-[10px] text-[var(--muted-foreground)]">
              {t('action')}
            </div>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as FundAction)}
              className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
            >
              <option value="issue">{t('issue')}</option>
              <option value="burn">{t('burn')}</option>
              <option value="allocate">{t('allocate')}</option>
              <option value="transfer">{t('transfer')}</option>
              <option value="return">{t('returnToTreasury')}</option>
            </select>
          </div>
          {showFromPeak && (
            <div>
              <div className="meta-mono mb-2 text-[10px] text-[var(--muted-foreground)]">
                {t('fromPeak')}
              </div>
              <select
                value={fromPeakId}
                onChange={(e) => setFromPeakId(e.target.value ? Number(e.target.value) : '')}
                className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
              >
                <option value="">—</option>
                {peaks.map((peak) => (
                  <option key={peak.peakId} value={peak.peakId}>
                    {peak.peakName} ({money(peak.balance)})
                  </option>
                ))}
              </select>
            </div>
          )}
          {showToPeak && (
            <div>
              <div className="meta-mono mb-2 text-[10px] text-[var(--muted-foreground)]">
                {t('toPeak')}
              </div>
              <select
                value={toPeakId}
                onChange={(e) => setToPeakId(e.target.value ? Number(e.target.value) : '')}
                className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
              >
                <option value="">—</option>
                {peaks.map((peak) => (
                  <option key={peak.peakId} value={peak.peakId}>
                    {peak.peakName} ({money(peak.balance)})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <div className="meta-mono mb-2 text-[10px] text-[var(--muted-foreground)]">
              {t('amount')}
            </div>
            <input
              type="number"
              min={1}
              step={1}
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
              className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
            />
          </div>
          <div>
            <div className="meta-mono mb-2 text-[10px] text-[var(--muted-foreground)]">
              {t('reason')}
            </div>
            <input
              type="text"
              value={reason}
              maxLength={200}
              onChange={(e) => setReason(e.target.value)}
              className={`${INPUT_CLASS} px-3 py-2 text-[13px]`}
            />
          </div>
        </div>
        {formError && (
          <div className="mt-3 font-mono text-[12px] text-[var(--destructive)]">{formError}</div>
        )}
        <div className="mt-5">
          <Button type="button" onClick={() => void handleSubmit()} loading={submitting}>
            {submitting ? t('submitting') : t('submit')}
          </Button>
        </div>
      </section>

      {/* 峰资金 */}
      <section className="mb-12">
        <div className="meta-mono text-[12px] text-[var(--foreground)] mb-4">[ {t('peaks')} ]</div>
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-[var(--muted-foreground)]">
            <Spinner />
            <span className="meta-mono text-[11px]">{t('loading')}</span>
          </div>
        ) : peaks.length === 0 ? (
          <div className="py-8 meta-mono text-[11px] text-[var(--muted-foreground)]">
            {t('noData')}
          </div>
        ) : (
          <div className="overflow-x-auto border border-[var(--border)]">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--border)] meta-mono text-[10px] text-[var(--muted-foreground)]">
                  <th className="text-left px-4 py-3">{t('peakName')}</th>
                  <th className="text-left px-4 py-3">{t('peakCode')}</th>
                  <th className="text-right px-4 py-3">{t('members')}</th>
                  <th className="text-right px-4 py-3">{t('balance')}</th>
                  <th className="text-left px-4 py-3">{t('status')}</th>
                </tr>
              </thead>
              <tbody>
                {peaks.map((peak) => (
                  <tr key={peak.peakId} className="border-b border-[var(--border)] last:border-b-0">
                    <td className="px-4 py-3">{peak.peakName}</td>
                    <td className="px-4 py-3 font-mono text-[12px] text-[var(--muted-foreground)]">
                      {peak.peakCode}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{peak.memberCount}</td>
                    <td className="px-4 py-3 text-right font-mono">{money(peak.balance)}</td>
                    <td className="px-4 py-3 meta-mono text-[11px]">
                      {peak.isActive ? t('active') : t('archived')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 最近流水 */}
      <section>
        <div className="meta-mono text-[12px] text-[var(--foreground)] mb-4">
          [ {t('transactions')} ]
        </div>
        {txs.length === 0 ? (
          <div className="py-8 meta-mono text-[11px] text-[var(--muted-foreground)]">
            {t('noData')}
          </div>
        ) : (
          <div className="space-y-2">
            {txs.map((tx) => (
              <div key={tx.transactionId} className="border border-[var(--border)] p-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="meta-mono text-[11px] text-[var(--primary)]">{tx.type}</span>
                  <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                    #{tx.transactionId}
                  </span>
                  <span className="text-[12px] text-[var(--foreground)]">
                    {tx.entries.map((entry) => `${entryLabel(entry)} ${money(entry.delta)}`).join(' · ')}
                  </span>
                  <span className="ml-auto meta-mono text-[10px] text-[var(--muted-foreground)]">
                    {tx.actorName || '—'} · {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : '—'}
                  </span>
                </div>
                {tx.reason && (
                  <div className="mt-1 text-[11px] text-[var(--muted-foreground)]">{tx.reason}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
