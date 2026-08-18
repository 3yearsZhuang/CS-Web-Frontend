'use client';

/**
 * @file MyClaimsTab — 我的认领（Tab 02）
 *
 * 从 `app/tools/task/page.tsx` 拆出（GENERAL 2.4「组件 > 500 行拆分」）。
 * 仅负责渲染；状态与逻辑由父页面注入的 `useTasks` 返回值提供（GENERAL 2.2）。
 */

import { useTranslations } from 'next-intl';
import { SectionLoading, GhostTitle } from '@/components';
import type { useTasks } from './use-tasks';
import { statusBadge } from './task-shared';

export function MyClaimsTab(props: ReturnType<typeof useTasks>) {
  const t = useTranslations('toolsTask');
  const { user, claimsLoading, myClaims, handleCancelClaim } = props;

  return (
    <div>
      <GhostTitle as="h2" className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)] mb-10 sm:mb-16">
        {t('tabMyClaims')}
      </GhostTitle>

      {!user ? (
        <div className="py-12 text-center">
          <div className="meta-mono text-[var(--muted-foreground)] mb-4">[ {t('notLoggedIn')} ]</div>
          <p className="text-[14px] text-[var(--muted-foreground)]">{t('loginToViewClaims')}</p>
        </div>
      ) : claimsLoading ? (
        <SectionLoading label="Loading..." />
      ) : myClaims.length === 0 ? (
        <div className="py-12 text-center border-t border-[var(--border)]">
          <div className="meta-mono text-[var(--muted-foreground)] mb-4">[ No Claim ]</div>
          <p className="text-[14px] text-[var(--muted-foreground)]">{t('noClaims')}</p>
        </div>
      ) : (
        <div className="border-t border-[var(--border)]">
          {myClaims.map((claim) => {
            const info = statusBadge(claim.status, t);
            return (
              <div key={claim.id} className="border-b border-[var(--border)] p-5 sm:p-6 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[13px] text-[var(--foreground)] truncate">{t('taskHash')}{claim.taskId.slice(0, 8)}...</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center gap-1 meta-mono text-[10px] px-2 py-0.5 border ${info.cls}`}>
                      {info.icon}
                      {info.label}
                    </span>
                    <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">{claim.createdAt}</span>
                  </div>
                  {claim.claimNote && <p className="text-[12px] text-[var(--muted-foreground)] mt-1">{claim.claimNote}</p>}
                  {claim.reviewNote && <p className="text-[12px] text-[var(--muted-foreground)] mt-1 italic">{t('reviewNote')} {claim.reviewNote}</p>}
                </div>
                {claim.status === 'claimed' && (
                  <button
                    onClick={() => handleCancelClaim(claim.taskId)}
                    className="meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--destructive)] underline-grow flex-shrink-0"
                  >
                    {t('cancel')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
