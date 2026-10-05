/**
 * @file Agent 每日简报 widget（AG-P3-03）——五节素材规则聚合卡。
 * status=failed 时静默降级为提示（验收：生成失败不影响工作台）。
 */
'use client';

import { useTranslations } from 'next-intl';
import { Newspaper } from 'lucide-react';
import { EmptyState } from '@/components/feedback/empty-state';
import { WorkbenchCard } from '../workbench-card';
import { apiRequest } from '@/shared/hooks/use-api-request';
import { useCallback, useEffect, useState } from 'react';

/** 简报（后端 TZModel camelCase 出参） */
interface Briefing {
  id: number;
  briefDate: string;
  content: {
    reviews?: number | null;
    focusMinutes?: number | null;
    tasks?: number | null;
    community?: number | null;
    inboxPending?: number | null;
  } | null;
  status: 'ready' | 'failed';
}

export default function AgentBriefingWidget() {
  const t = useTranslations('workbench');
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await apiRequest<{ briefing: Briefing }>('/api/agent-briefing');
      if (!r.ok || !r.data?.briefing) throw new Error(r.error ?? t('agentBriefingLoadFailed'));
      setBriefing(r.data.briefing);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('agentBriefingLoadFailed'));
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const c = briefing?.content ?? {};
  const sections: Array<[string, number | null | undefined]> = [
    [t('agentBriefingReviews'), c.reviews],
    [t('agentBriefingFocus'), c.focusMinutes],
    [t('agentBriefingTasks'), c.tasks],
    [t('agentBriefingCommunity'), c.community],
    [t('agentBriefingInbox'), c.inboxPending],
  ];

  return (
    <WorkbenchCard corner="BRF" title={t('agentBriefingTitle')}>
      <div aria-busy={!briefing && !error}>
        {error && (
          <p className="py-2 text-[12px] text-[var(--muted-foreground)]" role="alert">
            {error}
            <button type="button" className="ml-2 underline" onClick={() => void load()}>
              {t('agentInboxRetry')}
            </button>
          </p>
        )}
        {briefing && briefing.status === 'failed' && (
          <p className="py-2 text-[12px] text-[var(--muted-foreground)]">
            {t('agentBriefingDegraded')}
          </p>
        )}
        {briefing && briefing.status === 'ready' && (
          <ul className="grid grid-cols-2 gap-2">
            {sections.map(([label, value]) => (
              <li
                key={label}
                className="rounded-lg border border-[var(--border)] px-3 py-2"
                data-testid={`briefing-${label}`}
              >
                <div className="meta-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  {label}
                </div>
                <div className="mt-1 text-[20px] font-semibold text-[var(--foreground)]">
                  {value ?? '—'}
                </div>
              </li>
            ))}
          </ul>
        )}
        {briefing &&
          briefing.status === 'ready' &&
          Object.values(c).every((v) => v == null) && (
            <EmptyState
              label={t('agentBriefingEmpty')}
              message={t('agentBriefingEmptyHint')}
              className="py-6"
            />
          )}
      </div>
    </WorkbenchCard>
  );
}
