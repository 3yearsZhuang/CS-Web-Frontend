'use client';

/**
 * @file ActivityTab — 活动记录（Tab 03）
 *
 * 从 `app/profile/page.tsx` 拆出（GENERAL 2.4「组件 > 500 行拆分」）。
 * 仅负责渲染；活动数据由父页面通过 `useProfile` 注入。
 */

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { formatDate } from '@/shared/utils/utils';
import type { ActivityParticipation } from '@/modules/users/types';

export interface ActivityTabProps {
  activities: ActivityParticipation[];
}

export function ActivityTab({ activities }: ActivityTabProps) {
  const t = useTranslations('profile');

  return (
    <div className="grid grid-cols-12 gap-0 border-t border-[var(--border)]">
      <div className="col-span-12 md:col-span-8 md:col-start-3">
        {activities.length === 0 ? (
          // 空状态
          <div className="p-8 sm:p-12 text-center">
            <div className="meta-mono text-[var(--muted-foreground)] mb-4">
              {t('noRecord')}
            </div>
            <p className="text-[14px] text-[var(--muted-foreground)]">
              {t('noActivity')}
            </p>
            <Link
              href="/events"
              className="mt-6 inline-block meta-mono text-[var(--primary)] underline-grow"
            >
              {t('browseEvents')}
            </Link>
          </div>
        ) : (
          // 活动列表
          <ul>
            {activities.map((act, idx) => (
              <li
                key={act.id}
                className={`p-6 sm:p-8 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-6 ${
                  idx < activities.length - 1
                    ? 'border-b border-[var(--border)]'
                    : ''
                }`}
              >
                <span className="meta-mono text-[var(--primary)] text-[12px] shrink-0">
                  {formatDate(act.activityDate)}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[15px] sm:text-[16px] text-[var(--foreground)]">
                    {act.activityTitle}
                  </div>
                  {act.role && (
                    <div className="mt-1 meta-mono text-[11px] text-[var(--muted-foreground)]">
                      {t('role', { role: act.role })}
                    </div>
                  )}
                </div>
                <span className="meta-mono text-[10px] text-[var(--muted-foreground)] shrink-0">
                  0{idx + 1}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
