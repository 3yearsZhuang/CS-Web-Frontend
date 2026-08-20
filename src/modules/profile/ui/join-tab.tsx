'use client';

/**
 * @file JoinTab — 入社申请（Tab 05）：当前用户的申请列表 + 状态
 *
 * 从 `app/profile/page.tsx` 的 ProfileJoinTab 拆出（GENERAL 2.4「组件 > 500 行拆分」）。
 * 自管申请列表加载，状态与 API 调用集中于本组件（GENERAL 2.2 展示/容器分离）。
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Badge } from '@/components';
import type { BadgeVariant } from '@/components';
import { useTranslations } from 'next-intl';
import { formatDate } from '@/shared/utils/utils';
import { apiRequest } from '@/shared/hooks/use-api-request';

import type { JoinApplication } from '@/modules/join/types';

export function JoinTab() {
  const t = useTranslations('profile');
  const [applications, setApplications] = useState<JoinApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const r = await apiRequest<{ applications?: JoinApplication[] }>('/api/join/mine');
      if (cancelled) return;
      if (!r.ok) {
        setError(r.error ?? t('loadFailed'));
        return;
      }
      setApplications(r.data?.applications || []);
    };
    void load().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const statusLabel = (s: string) =>
    s === 'pending' ? t('statusPending') : s === 'approved' ? t('statusApproved') : t('statusRejected');
  const statusVariant = (s: string): BadgeVariant =>
    s === 'pending' ? 'amber' : s === 'approved' ? 'success' : 'danger';

  if (loading) {
    return (
      <div className="grid grid-cols-12 gap-0 border-t border-[var(--border)]">
        <div className="col-span-12 md:col-span-8 md:col-start-3 p-6 sm:p-8">
          <div className="meta-mono text-[var(--muted-foreground)]">{t('loading')}</div>
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
      <div className="col-span-12 md:col-span-8 md:col-start-3">
        {applications.length === 0 ? (
          <div className="p-8 sm:p-12 text-center">
            <div className="meta-mono text-[var(--muted-foreground)] mb-4">
              {t('noApplication')}
            </div>
            <p className="text-[14px] text-[var(--muted-foreground)] mb-6">
              {t('noApplicationDesc')}
            </p>
            <Link
              href="/about"
              className="meta-mono text-[var(--primary)] underline-grow"
            >
              {t('fillApplication')}
            </Link>
          </div>
        ) : (
          <ul>
            {applications.map((app, idx) => (
              <li
                key={app.id}
                className={`p-6 sm:p-8 ${idx < applications.length - 1 ? 'border-b border-[var(--border)]' : ''}`}
              >
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <span className="meta-mono text-[var(--primary)] text-[12px]">
                    {formatDate(app.createdAt)}
                  </span>
                  <Badge variant={statusVariant(app.status)}>
                    {statusLabel(app.status)}
                  </Badge>
                </div>
                <div className="text-[15px] text-[var(--foreground)] mb-2">
                  {app.applicantName} · {t('studentId', { id: app.studentId })} · {app.major}
                </div>
                {app.techTags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {app.techTags.map((tag, i) => (
                      <span
                        key={`${tag}-${i}`}
                        className="meta-mono text-[10px] px-2 py-0.5 border border-[var(--border)] text-[var(--muted-foreground)]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {app.reviewNote && (
                  <div className="mt-3 p-3 border-l-2 border-[var(--border)] bg-[var(--muted)]/[0.04]">
                    <div className="meta-mono text-[10px] text-[var(--muted-foreground)] mb-1">
                      {t('reviewNote')}
                    </div>
                    <p className="text-[12px] text-[var(--foreground)]">{app.reviewNote}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
