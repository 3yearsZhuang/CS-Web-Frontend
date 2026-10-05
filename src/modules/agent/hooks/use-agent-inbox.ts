/**
 * @file Agent 建议收件箱 hook（AG-P3-01）：pending 列表加载 + 处理动作（accept/dismiss/snooze）。
 * 处理成功后本地移除该条（状态机终态/暂后不再出现在 pending 视图）。
 */
'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { apiRequest } from '@/shared/hooks/use-api-request';
import type { AgentInboxItem, InboxAction } from '../types';

export function useAgentInbox(limit = 20) {
  const t = useTranslations('workbench');
  const [items, setItems] = useState<AgentInboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);
  const [, startTransition] = useTransition();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiRequest<{ items: AgentInboxItem[] }>(
        `/api/agent-inbox?status=pending&pageSize=${limit}`,
      );
      if (!r.ok) throw new Error(r.error ?? t('agentInboxLoadFailed'));
      setItems(r.data?.items ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('agentInboxLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [limit, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = useCallback(
    async (id: number, action: InboxAction, snoozeMinutes?: number) => {
      setActingId(id);
      try {
        const r = await apiRequest<{ item: AgentInboxItem }>(
          `/api/agent-inbox/${id}/status`,
          { method: 'PATCH', body: { action, snoozeMinutes } },
        );
        if (!r.ok) throw new Error(r.error ?? t('agentInboxActionDone'));
        // pending 视图本地移除；snooze 到期后由后端惰性回收回 pending，下次加载可见
        startTransition(() => {
          setItems((prev) => prev.filter((it) => it.id !== id));
        });
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : t('agentInboxActionDone'));
        return false;
      } finally {
        setActingId(null);
      }
    },
    [t],
  );

  return { items, loading, error, actingId, act, reload: load };
}
