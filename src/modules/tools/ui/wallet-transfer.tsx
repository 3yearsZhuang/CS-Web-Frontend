'use client';

/**
 * @file WalletTransfer — 灵石转账与最近流水（PA12 / §6.3）
 *
 * 付款人由后端按登录身份决定；BFF 注入 Idempotency-Key，重复提交不会双扣。
 * 团队任务奖励全额进入队长余额后，队长在此自由转账分配。
 */

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components';
import { apiRequest } from '@/shared/hooks/use-api-request';
import { TASK_INPUT_CLASS } from './task-shared';

interface RecipientRow {
  userId: number;
  displayName?: string | null;
  username?: string | null;
}

interface EntryRow {
  id: number;
  delta: string;
  balanceAfter: string;
  createdAt?: string | null;
}

interface RecipientsBody {
  items?: RecipientRow[];
}

interface EntriesBody {
  items?: EntryRow[];
}

export function WalletTransfer({ balance, onDone }: { balance: number; onDone: () => void }) {
  const t = useTranslations('toolsTask');
  const [query, setQuery] = useState('');
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [recipientId, setRecipientId] = useState('');
  const [amount, setAmount] = useState('');
  const [remark, setRemark] = useState('');
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<EntryRow[]>([]);

  const loadEntries = useCallback(() => {
    apiRequest<EntriesBody>('/api/wallet/me/entries?limit=20', { cache: 'no-store' })
      .then((r) => {
        if (r.ok) setEntries(r.data?.items ?? []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleSearch = async () => {
    const q = query.trim();
    setError(null);
    setMessage(null);
    if (q.length < 3) {
      setError(t('transferRecipientHint'));
      return;
    }
    setSearching(true);
    const result = await apiRequest<RecipientsBody>(
      `/api/wallet/recipients?q=${encodeURIComponent(q)}`,
      { cache: 'no-store' },
    );
    setSearching(false);
    if (!result.ok) {
      setError(result.error ?? t('actionFailed'));
      return;
    }
    const items = result.data?.items ?? [];
    setRecipients(items);
    setRecipientId(items.length > 0 ? String(items[0].userId) : '');
    if (items.length === 0) setError(t('transferNoRecipient'));
  };

  const handleTransfer = async () => {
    setError(null);
    setMessage(null);
    if (!recipientId) {
      setError(t('transferNoRecipient'));
      return;
    }
    if (!/^[1-9][0-9]*$/.test(amount)) {
      setError(t('actionFailed'));
      return;
    }
    setSaving(true);
    const result = await apiRequest('/api/wallet/transfers', {
      method: 'POST',
      body: {
        recipientUserId: Number(recipientId),
        amount,
        remark: remark.trim() || undefined,
      },
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? t('actionFailed'));
      return;
    }
    setMessage(t('transferSuccess'));
    setAmount('');
    setRemark('');
    setRecipients([]);
    setQuery('');
    setRecipientId('');
    loadEntries();
    onDone();
  };

  return (
    <>
      <div className="p-6 sm:p-8 border-b border-[var(--border)]">
        <div className="meta-mono mb-4">{t('transferTitle')}</div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('transferRecipientHint')}
            className={`${TASK_INPUT_CLASS} flex-1`}
            maxLength={50}
          />
          <Button onClick={handleSearch} disabled={searching}>
            {t('transferSearch')}
          </Button>
        </div>
        {recipients.length > 0 && (
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <select
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className={`${TASK_INPUT_CLASS} flex-1`}
            >
              {recipients.map((item) => (
                <option key={item.userId} value={item.userId}>
                  {item.displayName || item.username || item.userId}
                </option>
              ))}
            </select>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder={t('transferAmount')}
              className={`${TASK_INPUT_CLASS} sm:w-32`}
              inputMode="numeric"
            />
            <input
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder={t('transferRemark')}
              className={`${TASK_INPUT_CLASS} flex-1`}
              maxLength={200}
            />
            <Button
              onClick={handleTransfer}
              disabled={saving || !recipientId || !amount || amount === '0'}
            >
              {saving ? t('teamLoading') : t('transferAction')}
            </Button>
          </div>
        )}
        <p className="mt-3 meta-mono text-[11px] text-[var(--muted-foreground)]">
          [ Balance ] {balance} {t('pointsUnit')}
        </p>
        {message && <p className="mt-2 text-sm text-[var(--primary)]">{message}</p>}
        {error && <p className="mt-2 text-sm text-[var(--destructive)]">{error}</p>}
      </div>

      <div className="p-6 sm:p-8 border-b border-[var(--border)]">
        <div className="meta-mono mb-4">{t('entriesTitle')}</div>
        {entries.length === 0 ? (
          <p className="text-[12px] text-[var(--muted-foreground)]">{t('entriesEmpty')}</p>
        ) : (
          <div className="space-y-0 border-t border-[var(--border)]">
            {entries.map((entry) => {
              const delta = Number(entry.delta);
              return (
                <div
                  key={entry.id}
                  className="flex items-center justify-between py-3 border-b border-[var(--border)]"
                >
                  <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                    {entry.createdAt ?? '—'}
                  </span>
                  <span className="flex items-center gap-6">
                    <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                      {t('pointsUnit')} {entry.balanceAfter}
                    </span>
                    <span
                      className={`meta-mono text-[12px] ${
                        delta > 0
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-[var(--destructive)]'
                      }`}
                    >
                      {delta > 0 ? '+' : ''}
                      {delta}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
