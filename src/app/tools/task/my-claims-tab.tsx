'use client';

/**
 * @file MyClaimsTab — 我的认领（Tab 02）
 *
 * 从 `app/tools/task/page.tsx` 拆出（GENERAL 2.4「组件 > 500 行拆分」）。
 * 仅负责渲染；状态与逻辑由父页面注入的 `useTasks` 返回值提供（GENERAL 2.2）。
 */

import { SectionLoading } from '@/components';
import type { useTasks } from './use-tasks';
import { statusBadge } from './task-shared';

export function MyClaimsTab(props: ReturnType<typeof useTasks>) {
  const { user, claimsLoading, myClaims, handleCancelClaim } = props;

  return (
    <div>
      <h2 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)] mb-10 sm:mb-16">
        我的<span className="text-[var(--primary)]">认领</span>
      </h2>

      {!user ? (
        <div className="py-12 text-center">
          <div className="meta-mono text-[var(--muted-foreground)] mb-4">[ 未登录 ]</div>
          <p className="text-[14px] text-[var(--muted-foreground)]">请先登录查看认领记录。</p>
        </div>
      ) : claimsLoading ? (
        <SectionLoading label="Loading..." />
      ) : myClaims.length === 0 ? (
        <div className="py-12 text-center border-t border-[var(--border)]">
          <div className="meta-mono text-[var(--muted-foreground)] mb-4">[ No Claim ]</div>
          <p className="text-[14px] text-[var(--muted-foreground)]">你还没有认领过任务。</p>
        </div>
      ) : (
        <div className="border-t border-[var(--border)]">
          {myClaims.map((claim) => {
            const info = statusBadge(claim.status);
            return (
              <div key={claim.id} className="border-b border-[var(--border)] p-5 sm:p-6 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[13px] text-[var(--foreground)] truncate">任务 #{claim.taskId.slice(0, 8)}...</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`inline-flex items-center gap-1 meta-mono text-[10px] px-2 py-0.5 border ${info.cls}`}>
                      {info.icon}
                      {info.label}
                    </span>
                    <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">{claim.createdAt}</span>
                  </div>
                  {claim.claimNote && <p className="text-[12px] text-[var(--muted-foreground)] mt-1">{claim.claimNote}</p>}
                  {claim.reviewNote && <p className="text-[12px] text-[var(--muted-foreground)] mt-1 italic">审核备注: {claim.reviewNote}</p>}
                </div>
                {claim.status === 'claimed' && (
                  <button
                    onClick={() => handleCancelClaim(claim.taskId)}
                    className="meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--destructive)] underline-grow flex-shrink-0"
                  >
                    取消
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
