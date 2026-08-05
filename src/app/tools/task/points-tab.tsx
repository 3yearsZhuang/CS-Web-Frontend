'use client';

/**
 * @file PointsTab — 积分系统（Tab 03）：概览 + 等级 + 历史 + 排行榜
 *
 * 从 `app/tools/task/page.tsx` 拆出（GENERAL 2.4「组件 > 500 行拆分」）。
 * 仅负责渲染；状态与逻辑由父页面注入的 `useTasks` 返回值提供（GENERAL 2.2）。
 */

import { Trophy } from 'lucide-react';
import { SectionLoading } from '@/components';
import type { useTasks } from './use-tasks';

const LEVEL_THRESHOLDS = [
  { l: 1, t: '新人学徒', p: 0 },
  { l: 2, t: '初级成员', p: 50 },
  { l: 3, t: '活跃成员', p: 150 },
  { l: 4, t: '资深成员', p: 400 },
  { l: 5, t: '核心骨干', p: 1000 },
  { l: 6, t: '技术专家', p: 2500 },
  { l: 7, t: '协会元老', p: 5000 },
];

export function PointsTab(props: ReturnType<typeof useTasks>) {
  const { user, pointsLoading, pointsProfile, leaderboard } = props;

  return (
    <div>
      <h2 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)] mb-10 sm:mb-16">
        积分<span className="text-[var(--primary)]">系统</span>
      </h2>

      {!user ? (
        <div className="py-12 text-center">
          <div className="meta-mono text-[var(--muted-foreground)] mb-4">[ 未登录 ]</div>
          <p className="text-[14px] text-[var(--muted-foreground)]">请先登录查看积分。</p>
        </div>
      ) : pointsLoading ? (
        <SectionLoading label="Loading..." />
      ) : (
        <div className="border-t border-[var(--border)]">
          {/* 积分概览 */}
          {pointsProfile && (
            <div className="p-6 sm:p-8 border-b border-[var(--border)]">
              <div className="flex items-baseline gap-4">
                <div>
                  <div className="meta-mono text-[11px] text-[var(--muted-foreground)] mb-1">[ Balance ]</div>
                  <div className="display-serif text-[clamp(36px,6vw,64px)] text-[var(--primary)]">
                    {pointsProfile.balance}
                  </div>
                </div>
                <div>
                  <div className="meta-mono text-[11px] text-[var(--muted-foreground)] mb-1">[ Level ]</div>
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-[var(--primary)]" />
                    <span className="text-[16px] text-[var(--foreground)]">
                      Lv.{pointsProfile.level} — {pointsProfile.levelTitle}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 等级说明 */}
          <div className="p-6 sm:p-8 border-b border-[var(--border)]">
            <div className="meta-mono mb-4">[ Level Thresholds ]</div>
            <div className="space-y-2">
              {LEVEL_THRESHOLDS.map((lv) => (
                <div
                  key={lv.l}
                  className={`flex items-center justify-between text-[12px] font-mono py-1.5 px-3 border border-[var(--border)] ${
                    pointsProfile && pointsProfile.level === lv.l
                      ? 'border-[var(--primary)] bg-[var(--primary)]/[0.04]'
                      : ''
                  }`}
                >
                  <span className="text-[var(--foreground)]">Lv.{lv.l} {lv.t}</span>
                  <span className="meta-mono text-[var(--muted-foreground)]">{lv.p} 分</span>
                </div>
              ))}
            </div>
          </div>

          {/* 积分历史 */}
          {pointsProfile && pointsProfile.transactions.length > 0 && (
            <div className="p-6 sm:p-8">
              <div className="meta-mono mb-4">[ Transactions ]</div>
              <div className="space-y-0 border-t border-[var(--border)]">
                {pointsProfile.transactions.slice(0, 20).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between py-3 border-b border-[var(--border)]">
                    <div>
                      <span className="text-[13px] text-[var(--foreground)]">{tx.reason}</span>
                      <span className="meta-mono text-[10px] text-[var(--muted-foreground)] ml-2">{tx.createdAt}</span>
                    </div>
                    <span className={`meta-mono text-[12px] ${tx.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-[var(--destructive)]'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 排行榜 */}
          {leaderboard.length > 0 && (
            <div className="p-6 sm:p-8 border-t border-[var(--border)]">
              <div className="meta-mono mb-4">[ Leaderboard Top 20 ]</div>
              <div className="space-y-0 border-t border-[var(--border)]">
                {leaderboard.map((entry, idx) => (
                  <div key={entry.userId} className="flex items-center justify-between py-3 border-b border-[var(--border)]">
                    <div className="flex items-center gap-3">
                      <span className="meta-mono text-[11px] text-[var(--muted-foreground)] w-5 text-right">
                        {idx + 1}
                      </span>
                      <span className="text-[13px] text-[var(--foreground)]">
                        {entry.displayName || entry.userId.slice(0, 8)}
                      </span>
                      <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                        Lv.{entry.level}
                      </span>
                    </div>
                    <span className="meta-mono text-[12px] text-[var(--primary)]">{entry.balance} 分</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
