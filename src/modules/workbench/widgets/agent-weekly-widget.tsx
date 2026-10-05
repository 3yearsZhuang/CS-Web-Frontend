/**
 * @file Agent 每周复盘 widget（AG-P3-04）——周窗口六节聚合卡。
 * status=failed 时静默降级为提示（验收：生成失败不影响工作台）。
 */
'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { WorkbenchCard } from '../workbench-card';
import { apiRequest } from '@/shared/hooks/use-api-request';

/** 周复盘（后端 TZModel camelCase 出参） */
interface WeeklyReview {
  id: number;
  weekStart: string;
  content: {
    focusMinutes?: number | null;
    newWrongAnswers?: number | null;
    tasksApproved?: number | null;
    communityPosts?: number | null;
    planCompletion?: { completed: number; total: number } | null;
    nextWeekHints?: string[] | null;
  } | null;
  status: 'ready' | 'failed';
}

export default function AgentWeeklyWidget() {
  const t = useTranslations('workbench');
  const [review, setReview] = useState<WeeklyReview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await apiRequest<{ review: WeeklyReview }>('/api/agent-weekly-review');
      if (!r.ok || !r.data?.review) throw new Error(r.error ?? t('agentWeeklyLoadFailed'));
      setReview(r.data.review);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('agentWeeklyLoadFailed'));
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const c = review?.content ?? {};
  const plan = c.planCompletion ?? null;
  const rows: Array<[string, number | null | undefined]> = [
    [t('agentWeeklyFocus'), c.focusMinutes],
    [t('agentWeeklyWrong'), c.newWrongAnswers],
    [t('agentWeeklyTasks'), c.tasksApproved],
    [t('agentWeeklyCommunity'), c.communityPosts],
  ];

  return (
    <WorkbenchCard corner="REV" title={t('agentWeeklyTitle')}>
      <div aria-busy={!review && !error}>
        {error && (
          <p className="py-2 text-[12px] text-[var(--muted-foreground)]" role="alert">
            {error}
            <button type="button" className="ml-2 underline" onClick={() => void load()}>
              {t('agentInboxRetry')}
            </button>
          </p>
        )}
        {review && review.status === 'failed' && (
          <p className="py-2 text-[12px] text-[var(--muted-foreground)]">
            {t('agentWeeklyDegraded')}
          </p>
        )}
        {review && review.status === 'ready' && (
          <>
            <ul className="grid grid-cols-2 gap-2">
              {rows.map(([label, value]) => (
                <li
                  key={label}
                  className="rounded-lg border border-[var(--border)] px-3 py-2"
                  data-testid={`weekly-${label}`}
                >
                  <div className="meta-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                    {label}
                  </div>
                  <div className="mt-1 text-[20px] font-semibold text-[var(--foreground)]">
                    {value ?? '—'}
                  </div>
                </li>
              ))}
              {plan && (
                <li
                  className="rounded-lg border border-[var(--border)] px-3 py-2"
                  data-testid="weekly-plan"
                >
                  <div className="meta-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                    {t('agentWeeklyPlan')}
                  </div>
                  <div className="mt-1 text-[20px] font-semibold text-[var(--foreground)]">
                    {plan.completed}/{plan.total}
                  </div>
                </li>
              )}
            </ul>
            {(c.nextWeekHints ?? []).length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {(c.nextWeekHints ?? []).map((hint) => (
                  <li
                    key={hint}
                    className="flex items-start gap-1.5 text-[12px] leading-[1.6] text-[var(--muted-foreground)]"
                  >
                    <CalendarRange className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {hint}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        {review && review.status === 'ready' && !c.focusMinutes && !c.communityPosts && (
          <EmptyState
            label={t('agentWeeklyEmpty')}
            message={t('agentWeeklyEmptyHint')}
            className="py-6"
          />
        )}
      </div>
    </WorkbenchCard>
  );
}
