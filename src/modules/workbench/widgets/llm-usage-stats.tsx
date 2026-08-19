/**
 * @file LLM 用量统计 + 模型接入设置（学习助手大模型的调用次数与 token 消耗）。
 * - 数据来自 llm_usage_logs 埋点（每次模型调用自动记录）
 * - 设置面板：用户自行接入 OpenAI 兼容 / Anthropic 的 API Key（后端 AES-256-GCM 加密存储）
 */
'use client';

import { useTranslations } from 'next-intl';
import { Activity, Gauge, Settings2, Save } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { apiRequest } from '@/shared/hooks/use-api-request';

interface LlmUsage {
  ok: boolean;
  days: number;
  today: { calls: number; tokens: number; avgLatencyMs: number };
  totalCalls: number;
  totalTokens: number;
  daily: { date: string; tokens: number; calls: number }[];
  models: { model: string; count: number }[];
}

interface LlmConfigResp {
  ok: boolean;
  configured?: boolean;
  provider?: string;
  baseUrl?: string | null;
  model?: string;
  apiKeyMasked?: string;
}

const W = 300;
const H = 90;
const PAD = 6;

interface LlmUsageStatsProps {
  /** 嵌入合并卡片（llm-widget）时去掉外层 card-minimal 与标题，仅渲染内容主体 */
  embedded?: boolean;
}

export default function LlmUsageStats({ embedded = false }: LlmUsageStatsProps) {
  const t = useTranslations('workbench');
  const [data, setData] = useState<LlmUsage | null>(null);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [form, setForm] = useState({ provider: 'openai', apiKey: '', baseUrl: '', model: 'gpt-4o-mini' });
  const [masked, setMasked] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadUsage = useCallback(async () => {
    const r = await apiRequest<LlmUsage>('/api/workbench/stats/llm-usage?days=30', { cache: 'no-store' });
    if (r.status === 401) {
      setNotLoggedIn(true);
      return;
    }
    if (!r.ok) return;
    setData(r.data);
  }, []);

  const loadConfig = useCallback(async () => {
    const r = await apiRequest<LlmConfigResp>('/api/workbench/llm-config', { cache: 'no-store' });
    if (!r.ok) return;
    const json = r.data;
    if (json && json.ok && json.configured) {
        setForm((prev) => ({
          ...prev,
          provider: json.provider ?? 'openai',
          baseUrl: json.baseUrl ?? '',
          model: json.model ?? 'gpt-4o-mini',
        }));
        setMasked(json.apiKeyMasked ?? '');
      }
  }, []);

  useEffect(() => {
    void loadUsage();
    void loadConfig();
  }, [loadUsage, loadConfig]);

  const saveConfig = useCallback(async () => {
    setSaving(true);
    try {
      const r = await apiRequest('/api/workbench/llm-config', {
        method: 'PUT',
        body: {
          provider: form.provider,
          apiKey: form.apiKey.trim(),
          baseUrl: form.baseUrl.trim(),
          model: form.model.trim() || 'gpt-4o-mini',
        },
      });
      if (r.ok) {
        setForm((prev) => ({ ...prev, apiKey: '' }));
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        await loadConfig();
      }
    } finally {
      setSaving(false);
    }
  }, [form, loadConfig]);

  const { linePoints, areaPoints, maxTokens } = useMemo(() => {
    const daily = data?.daily ?? [];
    const max = Math.max(1, ...daily.map((d) => d.tokens));
    const stepX = daily.length > 1 ? (W - PAD * 2) / (daily.length - 1) : 0;
    const pts = daily.map((d, i) => {
      const x = PAD + i * stepX;
      const y = H - PAD - (d.tokens / max) * (H - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return {
      linePoints: pts.join(' '),
      areaPoints: `${PAD},${H - PAD} ${pts.join(' ')} ${W - PAD},${H - PAD}`,
      maxTokens: max,
    };
  }, [data]);

  const topModels = useMemo(() => (data?.models ?? []).slice(0, 5), [data]);
  const modelMax = useMemo(() => Math.max(1, ...topModels.map((m) => m.count)), [topModels]);

  if (notLoggedIn) {
    return (
      <div className="p-5">
        <p className="text-[13px] text-[var(--muted-foreground)]">{t('loginRequired')}</p>
      </div>
    );
  }

  return (
    <div className={embedded ? 'flex flex-col gap-4' : 'card-minimal p-5 flex flex-col gap-4'}>
      {!embedded && (
        <div className="flex items-center justify-between gap-2">
          <h3 className="meta-mono text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
            {t('llmUsageTitle', { days: data?.days ?? 30 })}
          </h3>
          <Button size="sm" variant="pixel-outline" onClick={() => setShowSettings((v) => !v)}>
            <Settings2 className="w-4 h-4" />
            {t('llmSettings')}
          </Button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded p-3 bg-[var(--border)]/30">
          <p className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1">
            <Activity className="w-3 h-3" /> {t('llmTodayCalls')}
          </p>
          <p className="text-[22px] font-medium tabular-nums text-[var(--foreground)] mt-1">
            {data?.today.calls ?? 0}
          </p>
        </div>
        <div className="rounded p-3 bg-[var(--border)]/30">
          <p className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1">
            <Activity className="w-3 h-3" /> {t('llmTodayTokens')}
          </p>
          <p className="text-[22px] font-medium tabular-nums text-[var(--foreground)] mt-1">
            {data?.today.tokens ?? 0}
          </p>
        </div>
        <div className="rounded p-3 bg-[var(--border)]/30">
          <p className="text-[11px] text-[var(--muted-foreground)] flex items-center gap-1">
            <Gauge className="w-3 h-3" /> {t('llmLatencyMs')}
          </p>
          <p className="text-[22px] font-medium tabular-nums text-[var(--foreground)] mt-1">
            {data?.today.avgLatencyMs ?? 0}
            <span className="text-[11px] text-[var(--muted-foreground)] ml-0.5">ms</span>
          </p>
        </div>
      </div>

      <div className="flex items-baseline gap-4 flex-wrap">
        <span className="text-[12px] text-[var(--muted-foreground)]">
          {t('llmTotal')}:{' '}
          <b className="text-[var(--foreground)] tabular-nums">{data?.totalCalls ?? 0}</b> calls ·{' '}
          <b className="text-[var(--foreground)] tabular-nums">{data?.totalTokens ?? 0}</b> tokens
        </span>
      </div>

      {data && data.daily.length > 0 && maxTokens > 1 ? (
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="llm usage trend">
          <title>{t('llmUsageTitle', { days: data.days })}</title>
          <polygon points={areaPoints} fill="var(--chart-1)" opacity="0.08" />
          <polyline
            points={linePoints}
            fill="none"
            stroke="var(--chart-1)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <p className="text-[12px] text-[var(--muted-foreground)]">{t('llmNoData')}</p>
      )}

      {topModels.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {topModels.map((m) => (
            <div key={m.model} className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--muted-foreground)] truncate flex-1 min-w-0">
                {m.model}
              </span>
              <div className="flex-1 h-[6px] rounded-full bg-[var(--border)]/40 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--chart-1)]"
                  style={{ width: `${(m.count / modelMax) * 100}%` }}
                />
              </div>
              <span className="text-[11px] tabular-nums text-[var(--foreground)] w-8 text-right">
                {m.count}
              </span>
            </div>
          ))}
        </div>
      )}

      {(showSettings || embedded) && (
        <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-3">
          {masked && (
            <p className="text-[12px] text-[var(--muted-foreground)]">
              {t('llmMaskedHint', { masked })}
            </p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-[12px] text-[var(--muted-foreground)]">
              {t('llmProvider')}
              <Input
                as="select"
                value={form.provider}
                onChange={(e) => setForm((prev) => ({ ...prev, provider: e.target.value }))}
              >
                <option value="openai">OpenAI 兼容网关（Ollama / vLLM 等）</option>
                <option value="anthropic">Anthropic</option>
              </Input>
            </label>
            <label className="flex flex-col gap-1 text-[12px] text-[var(--muted-foreground)]">
              {t('llmModel')}
              <Input
                type="text"
                value={form.model}
                onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1 text-[12px] text-[var(--muted-foreground)]">
              {t('llmApiKey')}
              <Input
                type="password"
                value={form.apiKey}
                placeholder="sk-…"
                onChange={(e) => setForm((prev) => ({ ...prev, apiKey: e.target.value }))}
              />
            </label>
            <label className="flex flex-col gap-1 text-[12px] text-[var(--muted-foreground)]">
              {t('llmBaseUrl')}
              <Input
                type="text"
                value={form.baseUrl}
                placeholder="https://your-gateway.example.com/v1"
                onChange={(e) => setForm((prev) => ({ ...prev, baseUrl: e.target.value }))}
              />
            </label>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="pixel" loading={saving} onClick={() => void saveConfig()}>
              <Save className="w-4 h-4" />
              {t('llmSave')}
            </Button>
            {saved && <span className="text-[12px] text-emerald-500">{t('llmSaved')}</span>}
          </div>
        </div>
      )}
    </div>
  );
}
