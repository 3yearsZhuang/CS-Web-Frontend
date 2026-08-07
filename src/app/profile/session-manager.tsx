'use client';

/**
 * @file SessionManager — 活跃会话列表 + 远程登出（Tab 02 安全区子组件）
 *
 * 从 `app/profile/page.tsx` 拆出（GENERAL 2.4「组件 > 500 行拆分」）。
 * 自管会话数据加载与登出逻辑，不依赖父页面状态。
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useSWRConfig } from 'swr';
import { useConfirm } from '@/components/primitives/confirm-dialog';

/** 会话记录 */
interface SessionItem {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
}

export function SessionManager() {
  const t = useTranslations('profile');
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const { confirm } = useConfirm();
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/sessions')
      .then(async (res) => {
        if (!res.ok) throw new Error(t('loadFailed'));
        const data = await res.json();
        if (cancelled) return;
        setSessions(data.sessions || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleDelete = async (sessionId: string) => {
    setDeletingId(sessionId);
    try {
      const res = await fetch('/api/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      if (!res.ok) throw new Error(t('deleteFailed'));
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      // 静默失败
    } finally {
      setDeletingId(null);
    }
  };

  const handleRevokeAll = async () => {
    const ok = await confirm({
      title: t('logoutAllTitle'),
      message: t('logoutAllConfirm'),
      variant: 'danger',
      confirmLabel: t('logoutAllConfirmLabel'),
      cancelLabel: t('cancel'),
    });
    if (!ok) return;

    setRevokingAll(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true }),
      });
      if (!res.ok) throw new Error(t('logoutAllFailed'));
      // 全部撤销后当前设备也失效，刷新登录态并跳转登录页
      await mutate('/api/auth/me');
      router.push('/login');
    } catch {
      setRevokingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-12 gap-0 border-t border-[var(--border)]">
        <div className="col-span-12 md:col-span-8 md:col-start-3 p-6 sm:p-8">
          <div className="meta-mono text-[var(--muted-foreground)]">{t('loadingSessions')}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-12 gap-0 border-t border-[var(--border)]">
        <div className="col-span-12 md:col-span-8 md:col-start-3 p-6 sm:p-8">
          <div className="meta-mono text-[var(--destructive)]">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-0 border-t border-[var(--border)]">
      <div className="col-span-12 md:col-span-8 md:col-start-3 p-6 sm:p-8 md:py-10 space-y-6">
        <div className="meta-mono text-[var(--muted-foreground)] flex items-center justify-between gap-4">
          <span>
            {t('sessionsLabel')}
            <span className="ml-2">{t('active', { count: sessions.length })}</span>
          </span>
          <button
            onClick={handleRevokeAll}
            disabled={revokingAll || sessions.length === 0}
            className="meta-mono text-[11px] text-[var(--destructive)] hover:opacity-80 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {revokingAll ? '...' : t('logoutAll')}
          </button>
        </div>

        {sessions.length === 0 ? (
          <div className="meta-mono text-[var(--muted-foreground)]">{t('noSessions')}</div>
        ) : (
          <div className="space-y-3">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-4 border border-[var(--border)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="meta-mono text-[11px] text-[var(--muted-foreground)] mb-1">
                    {s.userAgent || t('unknownDevice')}
                  </div>
                  <div className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                    IP: {s.ip || '—'} · {t('created', { date: s.createdAt })}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(s.id)}
                  disabled={deletingId === s.id}
                  className="meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--destructive)] transition-colors shrink-0 ml-4"
                >
                  {deletingId === s.id ? '...' : t('logout')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
