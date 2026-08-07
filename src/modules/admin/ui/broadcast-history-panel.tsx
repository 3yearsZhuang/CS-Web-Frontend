/**
 * @file 广播历史子面板 — 从 admin-messages-panel 拆出（GENERAL 2.4 按关注点拆分）
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { RevealItem } from '@/components/effects/motion-primitives';
import { Button, SectionLoading } from '@/components';
import { type NotifHistoryItem } from '@/modules/admin/ui/types';
import { formatDate } from '@/shared/utils/utils';

const NOTIF_HISTORY_LIMIT = 20;

/** 广播历史子面板 — 拉取并展示群发通知历史 */
export function BroadcastHistoryPanel({ onForbidden }: { onForbidden: () => void }) {
  const router = useRouter();
  const t = useTranslations('adminNotifications');
  const [history, setHistory] = useState<NotifHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/admin/notifications?limit=${NOTIF_HISTORY_LIMIT}`, {
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
      if (!res.ok) return;
      const data = (await res.json()) as { broadcasts?: NotifHistoryItem[] };
      setHistory(data.broadcasts ?? []);
    } catch {
      // 静默
    } finally {
      setHistoryLoading(false);
    }
  }, [router, onForbidden]);

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅挂载时拉取一次，刷新按钮手动触发
  }, []);

  return (
    <RevealItem>
      <div className="py-5">
        <div className="flex items-center justify-between mb-6">
          <div className="meta-mono text-[var(--muted-foreground)]">[ Broadcast History ]</div>
          <div className="flex items-center gap-4">
            <div className="meta-mono text-[11px] text-[var(--muted-foreground)]">
              {t('recordsCount', { count: history.length })}
            </div>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => fetchHistory()}
              disabled={historyLoading}
            >
              {historyLoading ? t('refreshing') : t('refreshBtn')}
            </Button>
          </div>
        </div>

        {historyLoading && history.length === 0 ? (
          <SectionLoading label="Loading..." />
        ) : history.length === 0 ? (
          <div className="py-8 text-center">
            <p className="meta-mono text-[12px] text-[var(--muted-foreground)]">{t('noHistory')}</p>
          </div>
        ) : (
          <div className="border-t border-[var(--border)]">
            {history.map((h, idx) => (
              <article
                key={`${h.title}-${idx}`}
                className="grid grid-cols-12 gap-2 sm:gap-4 py-5 sm:py-6 border-b border-[var(--border)]"
              >
                <div className="col-span-12 md:col-span-8">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`meta-mono text-[10px] px-2 py-0.5 ${
                        h.type === 'system'
                          ? 'text-[var(--primary)] bg-[var(--primary)]/10'
                          : h.type === 'admin'
                            ? 'text-red-500 bg-red-500/10'
                            : 'text-emerald-500 bg-emerald-500/10'
                      }`}
                    >
                      {h.type}
                    </span>
                    <h3 className="text-[14px] sm:text-[15px] text-[var(--foreground)] tracking-tight break-words">
                      {h.title}
                    </h3>
                  </div>
                  {h.content && (
                    <p className="text-[12px] sm:text-[13px] text-[var(--muted-foreground)] leading-[1.7] mt-1 line-clamp-2">
                      {h.content}
                    </p>
                  )}
                </div>
                <div className="col-span-6 md:col-span-2 meta-mono text-[11px] text-[var(--muted-foreground)]">
                  {t('recipientsCount', { count: h.recipientCount })}
                </div>
                <div className="col-span-6 md:col-span-2 meta-mono text-[11px] text-[var(--muted-foreground)] text-right">
                  {formatDate(h.createdAt)}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </RevealItem>
  );
}
