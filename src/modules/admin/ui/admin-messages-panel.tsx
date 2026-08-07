/**
 * @file 统一消息管理面板 — 群发通知 / 公告管理 / 广播历史（子 Tab 切换，自包含）
 *
 * 公告管理、广播历史已分别抽离为独立子面板（GENERAL 2.4 按关注点拆分），
 * 本文件保留 Tab 切换 + 群发通知子面板。
 */
'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { RevealItem } from '@/components/effects/motion-primitives';
import { useToast } from '@/components/feedback/toast';
import { Button } from '@/components';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import { AnnouncementsPanel } from '@/modules/announcement/ui/admin-announcements-panel';
import { BroadcastHistoryPanel } from './broadcast-history-panel';

/* ============= 子 Tab 类型 ============= */

type MessagesSubTab = 'broadcast' | 'announcements' | 'history';

const NOTIF_TITLE_MAX = 120;
const NOTIF_CONTENT_MAX = 500;

const subTabMeta: { key: MessagesSubTab; num: string; label: string }[] = [
  { key: 'broadcast', num: '01', label: 'subTabBroadcast' },
  { key: 'announcements', num: '02', label: 'subTabAnnouncements' },
  { key: 'history', num: '03', label: 'subTabHistory' },
];

/* ============= 面板组件 ============= */

interface AdminMessagesPanelProps {
  onForbidden: () => void;
}

/** 统一消息管理面板 — 内部 Tab 切换：群发通知 / 公告管理 / 广播历史 */
export function AdminMessagesPanel({ onForbidden }: AdminMessagesPanelProps) {
  const router = useRouter();
  const t = useTranslations('adminNotifications');
  const { pushToast } = useToast();

  const [subTab, setSubTab] = useState<MessagesSubTab>('broadcast');

  // ---- 群发通知 ----
  const [notifForm, setNotifForm] = useState({ title: '', content: '' });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);

  /* ============= 群发通知 ============= */

  const handleNotifSubmit = useCallback(
    async (e: React.FormEvent) => {
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
        const res = await fetch('/api/admin/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: notifForm.title,
            content: notifForm.content || null,
          }),
        });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          count?: number;
          error?: string;
        } | null;
        if (!res.ok || !data?.ok) {
          setNotifError(data?.error || t('sendFailedShort'));
          return;
        }
        pushToast('success', t('sendSuccess', { count: data.count ?? 0 }));
        setNotifForm({ title: '', content: '' });
        setNotifError(null);
      } catch {
        setNotifError(t('networkErrorShort'));
      } finally {
        setNotifSaving(false);
      }
    },
    [notifForm, pushToast],
  );

  /* ============= 渲染 ============= */

  return (
    <>
      {/* 子 Tab 切换条 */}
      <RevealItem>
        <div className="border-t border-[var(--border)] border-b border-[var(--border)] py-4 mb-0">
          <div className="flex items-center gap-1 overflow-x-auto">
            {subTabMeta.map((meta) => (
              <button
                key={meta.key}
                onClick={() => setSubTab(meta.key)}
                className={`meta-mono text-[11px] px-4 py-2 transition-colors focus-amber whitespace-nowrap ${
                  subTab === meta.key
                    ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                [ {meta.num} ] {t(meta.label)}
              </button>
            ))}
          </div>
        </div>
      </RevealItem>

      {/* ============ 子面板：群发通知 ============ */}
      {subTab === 'broadcast' && (
        <>
          <RevealItem>
            <div className="py-5 border-b border-[var(--border)]">
              <div className="meta-mono text-[var(--muted-foreground)] mb-2">{t('panelLabel')}</div>
              <p className="text-[13px] text-[var(--foreground)] leading-[1.7]">
                {t('panelDescBefore')}
                <span className="text-[var(--primary)] meta-mono">{t('panelDescHighlight')}</span>
                {t('panelDescAfterShort')}
              </p>
            </div>
          </RevealItem>

          <RevealItem>
            <form
              onSubmit={handleNotifSubmit}
              className="py-8 border-b border-[var(--border)] space-y-6"
            >
              <div>
                <div className="meta-mono mb-2 text-[var(--muted-foreground)]">{t('fieldTitle')}</div>
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
                <div className="meta-mono mb-2 text-[var(--muted-foreground)]">{t('fieldContent')}</div>
                <textarea
                  value={notifForm.content}
                  maxLength={NOTIF_CONTENT_MAX}
                  rows={5}
                  onChange={(e) => setNotifForm((f) => ({ ...f, content: e.target.value }))}
                  className={`${INPUT_CLASS} px-4 py-2.5 text-[13px] resize-none`}
                  placeholder={t('contentPlaceholderShort')}
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
                  {notifSaving ? t('sendingShort') : t('broadcastBtn')}
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
        </>
      )}

      {/* ============ 子面板：公告管理 ============ */}
      {subTab === 'announcements' && <AnnouncementsPanel />}

      {/* ============ 子面板：广播历史 ============ */}
      {subTab === 'history' && <BroadcastHistoryPanel onForbidden={onForbidden} />}
    </>
  );
}
