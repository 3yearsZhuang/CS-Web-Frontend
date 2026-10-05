/**
 * @file Agent 自动化规则 hook（AG-P3-02）：规则列表 / 创建 / 更新 / 启停 / 删除。
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { apiRequest } from '@/shared/hooks/use-api-request';

/** 规则（后端 TZModel camelCase 出参） */
export interface AgentRule {
  id: number;
  userId: number;
  name: string;
  triggerType: string;
  condition: Record<string, unknown> | null;
  actionType: string;
  actionPayload: Record<string, unknown> | null;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  cooldownMinutes: number;
  maxPerHour: number;
  enabled: boolean;
  lastFiredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 创建/编辑表单载荷（camel，由 BFF 映射为 snake） */
export interface AgentRuleForm {
  name: string;
  triggerType: string;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  cooldownMinutes: number;
  maxPerHour: number;
}

export function useAgentRules() {
  const t = useTranslations('workbench');
  const [rules, setRules] = useState<AgentRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiRequest<{ items: AgentRule[] }>('/api/agent-rules?pageSize=100');
      if (!r.ok) throw new Error(r.error ?? t('agentRulesLoadFailed'));
      setRules(r.data?.items ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('agentRulesLoadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const createRule = useCallback(
    async (form: AgentRuleForm): Promise<boolean> => {
      try {
        const r = await apiRequest<{ rule: AgentRule }>('/api/agent-rules', {
          method: 'POST',
          body: form,
        });
        if (!r.ok || !r.data?.rule) throw new Error(r.error ?? t('agentRulesSaveFailed'));
        setRules((prev) => [r.data!.rule, ...prev]);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : t('agentRulesSaveFailed'));
        return false;
      }
    },
    [t],
  );

  const updateRule = useCallback(
    async (id: number, form: Partial<AgentRuleForm>): Promise<boolean> => {
      setBusyId(id);
      try {
        const r = await apiRequest<{ rule: AgentRule }>(`/api/agent-rules/${id}`, {
          method: 'PATCH',
          body: form,
        });
        if (!r.ok || !r.data?.rule) throw new Error(r.error ?? t('agentRulesSaveFailed'));
        setRules((prev) => prev.map((it) => (it.id === id ? r.data!.rule : it)));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : t('agentRulesSaveFailed'));
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [t],
  );

  const setEnabled = useCallback(
    async (id: number, enabled: boolean): Promise<boolean> => {
      setBusyId(id);
      try {
        const r = await apiRequest<{ rule: AgentRule }>(`/api/agent-rules/${id}/enabled`, {
          method: 'PATCH',
          body: { enabled },
        });
        if (!r.ok || !r.data?.rule) throw new Error(r.error ?? t('agentRulesSaveFailed'));
        setRules((prev) => prev.map((it) => (it.id === id ? r.data!.rule : it)));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : t('agentRulesSaveFailed'));
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [t],
  );

  const deleteRule = useCallback(
    async (id: number): Promise<boolean> => {
      setBusyId(id);
      try {
        const r = await apiRequest<{ ok: boolean }>(`/api/agent-rules/${id}`, {
          method: 'DELETE',
        });
        if (!r.ok) throw new Error(r.error ?? t('agentRulesSaveFailed'));
        setRules((prev) => prev.filter((it) => it.id !== id));
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : t('agentRulesSaveFailed'));
        return false;
      } finally {
        setBusyId(null);
      }
    },
    [t],
  );

  return { rules, loading, error, busyId, createRule, updateRule, setEnabled, deleteRule, reload: load };
}
