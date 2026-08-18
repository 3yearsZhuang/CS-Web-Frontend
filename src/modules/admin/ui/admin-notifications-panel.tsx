/**
 * @file 管理员通知管理面板 — 群发通知 + 群发历史（自包含，仅依赖父级 onForbidden）
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { apiRequest } from '@/shared/hooks/use-api-request';
import { RevealItem } from '@/components/effects/motion-primitives';
import { useToast } from '@/components/feedback/toast';
import { Button, SectionLoading } from '@/components';
import { type NotifHistoryItem, type NotifType } from '@/modules/admin/ui/types';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { formatDate } from '@/shared/utils/utils';

/* ============= 常量 ============= */

const NOTIF_TITLE_MAX = 120;
const NOTIF_CONTENT_MAX = 500;
const NOTIF_HISTORY_LIMIT = 20;

/* ============= 工具函数 ============= */

/** 通知类型样式 */
function notifTypeClass(t: NotifType): string {
  return t === 'system'
    ? 'text-[var(--primary)] bg-[var(--primary)]/10'
    : t === 'admin'
      ? 'text-red-500 bg-red-500/10'
      : 'text-emerald-500 bg-emerald-500/10';
}

/* ============= 面板组件 ============= */

interface AdminNotificationsPanelProps {
  onForbidden: () => void;
}

/** 管理员群发通知面板 — 发送通知给所有活跃用户，查看群发历史 */
export function AdminNotificationsPanel({ onForbidden }: AdminNotificationsPanelProps) {
  const router = useRouter();
  const t = useTranslations('adminNotifications');
  const { pushToast } = useToast();

  // 群发表单
  const [notifForm, setNotifForm] = useState<{ title: string; content: string }>({
    title: '',
    content: '',
  });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);

  // 群发历史
  const [notifHistory, setNotifHistory] = useState<NotifHistoryItem[]>([]);
  const [notifHistoryLoading, setNotifHistoryLoading] = useState(false);

  /* ============= 数据获取 ============= */

  /** 拉取群发历史（GET /api/admin/notifications） */
  const fetchNotifHistory = useCallback(async () => {
    setNotifHistoryLoading(true);
    try {
      const r = await apiRequest<{ broadcasts?: NotifHistoryItem[] }>(
        `/api/admin/notifications?limit=${NOTIF_HISTORY_LIMIT}`,
        { cache: 'no-store' },
      );
      if (r.status === 401) {
        router.replace('/login');
        return;
      }
      if (r.status === 403) {
        onForbidden();
        return;
      }
      if (!r.ok) {
        return;
      }
      setNotifHistory(r.data?.broadcasts ?? []);
    } catch {
      // 静默失败
    } finally {
      setNotifHistoryLoading(false);
    }
  }, [router, onForbidden]);

  /* ============= 副作用 ============= */

  // 挂载时拉取一次群发历史
  useEffect(() => {
    fetchNotifHistory();
  }, [fetchNotifHistory]);

  /* ============= 提交群发通知 ============= */

  const handleNotifSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifForm.title.trim()) {
      setNotifError(t('titleEmpty'));
      return;
    }
    if (notifForm.title.length > NOTIF_TITLE_MAX) {
      setNotifError(t('titleTooLong'));
      return;
    }
    if (notifForm.content.length > NOTIF_CONTENT_MAX) {
      setNotifError(t('contentTooLong'));
      return;
    }

    setNotifSaving(true);
    setNotifError(null);
    try {
      const r = await apiRequest<{ ok?: boolean; count?: number }>('/api/admin/notifications', {
        method: 'POST',
        body: {
          title: notifForm.title,
          content: notifForm.content || null,
        },
      });
      if (!r.ok || !r.data?.ok) {
        setNotifError(r.error ?? t('sendFailed'));
        return;
      }
      pushToast('success', t('sendSuccess', { count: r.data.count ?? 0 }));
      setNotifForm({ title: '', content: '' });
      setNotifError(null);
      fetchNotifHistory();
    } catch {
      setNotifError(t('networkError'));
    } finally {
      setNotifSaving(false);
    }
  };

  /* ============= 渲染 ============= */

  return (
    <>
      {/* 说明条 */}
      <RevealItem>
        <div className="border-t border-[var(--border)] border-b border-[var(--border)] py-5 sm:py-6 mb-0">
          <div className="grid grid-cols-12 gap-4 sm:gap-6 items-center">
            <div className="col-span-12 md:col-span-8">
              <div className="meta-mono text-[var(--muted-foreground)] mb-2">{t('panelLabel')}</div>
              <p className="text-[13px] sm:text-[14px] text-[var(--foreground)] leading-[1.7]">
                {t('panelDescBefore')}
                <span className="text-[var(--primary)] meta-mono">{t('panelDescHighlight')}</span>
                {t('panelDescAfter')}
              </p>
            </div>
            <div className="col-span-12 md:col-span-4 flex md:justify-end">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={() => fetchNotifHistory()}
                disabled={notifHistoryLoading}
              >
                {notifHistoryLoading ? t('refreshing') : t('refreshHistoryBtn')}
              </Button>
            </div>
          </div>
        </div>
      </RevealItem>

      {/* 群发表单 */}
      <RevealItem>
        <form
          onSubmit={handleNotifSubmit}
          className="py-8 sm:py-10 border-b border-[var(--border)] space-y-6"
        >
          <div>
            <div className="meta-mono mb-2 text-[var(--muted-foreground)]">
              {t('fieldTitle')}
            </div>
            <input
              type="text"
              value={notifForm.title}
              maxLength={NOTIF_TITLE_MAX}
              onChange={(e) => setNotifForm((f) => ({ ...f, title: e.target.value }))}
              className={`${INPUT_CLASS} px-4 py-2.5 text-[13px]`}
              autoFocus
            />
            <p className="meta-mono mt-1.5 text-[10px] text-[var(--muted-foreground)]">
              {notifForm.title.length}/{NOTIF_TITLE_MAX}
            </p>
          </div>

          <div>
            <div className="meta-mono mb-2 text-[var(--muted-foreground)]">
              {t('fieldContent')}
            </div>
            <textarea
              value={notifForm.content}
              maxLength={NOTIF_CONTENT_MAX}
              rows={5}
              onChange={(e) => setNotifForm((f) => ({ ...f, content: e.target.value }))}
              className={`${INPUT_CLASS} px-4 py-2.5 text-[13px] resize-none`}
              placeholder={t('contentPlaceholder')}
            />
            <p className="meta-mono mt-1.5 text-[10px] text-[var(--muted-foreground)]">
              {notifForm.content.length}/{NOTIF_CONTENT_MAX}
            </p>
          </div>

          {notifError && (
            <div className="p-3 border-l-2 border-[var(--destructive)] bg-[var(--destructive)]/[0.04] text-[12px] font-mono text-[var(--destructive)]">
              {notifError}
            </div>
          )}

          <div className="flex items-center gap-4">
            <Button type="submit" disabled={notifSaving} loading={notifSaving}>
              {notifSaving ? t('sending') : t('broadcastBtn')}
            </Button>
            <button
              type="button"
              onClick={() => {
                setNotifForm({ title: '', content: '' });
                setNotifError(null);
              }}
              className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] underline-grow"
            >
              {t('clearBtn')}
            </button>
          </div>
        </form>
      </RevealItem>

      {/* 群发历史 */}
      <RevealItem>
        <div className="py-8 sm:py-10">
          <div className="flex items-center justify-between mb-6">
            <div className="meta-mono text-[var(--muted-foreground)]">[ Recent Broadcasts ]</div>
            <div className="meta-mono text-[11px] text-[var(--muted-foreground)]">
              {t('recordsCount', { count: notifHistory.length })}
            </div>
          </div>

          {notifHistoryLoading && notifHistory.length === 0 ? (
            <SectionLoading label="Loading..." />
          ) : notifHistory.length === 0 ? (
            <div className="py-8 text-center">
              <p className="meta-mono text-[12px] text-[var(--muted-foreground)]">{t('noHistory')}</p>
            </div>
          ) : (
            <div className="border-t border-[var(--border)]">
              {notifHistory.map((h, idx) => (
                <article
                  key={`${h.title}-${idx}`}
                  className="grid grid-cols-12 gap-2 sm:gap-4 py-5 sm:py-6 border-b border-[var(--border)]"
                >
                  <div className="col-span-12 md:col-span-8">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`meta-mono text-[10px] px-2 py-0.5 ${notifTypeClass(h.type)}`}>
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
    </>
  );
}
