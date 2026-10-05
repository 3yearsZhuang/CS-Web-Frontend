/**
 * @file Agent 自动化规则管理面板（AG-P3-02）——列表 / 逐条启停 / 新建 / 编辑 / 删除。
 * 触发类型与裁决器参数（静音时段 / 冷却 / 每小时频次水位）的可视化编辑。
 */
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { EmptyState } from '@/components/feedback/empty-state';
import { useAgentRules, type AgentRule, type AgentRuleForm } from '../hooks/use-agent-rules';

const TRIGGER_OPTIONS = [
  'review_due',
  'exam_finished',
  'goal_stalled',
  'community_match',
  'resource_new',
] as const;

/** 空表单 */
function emptyForm(): AgentRuleForm {
  return {
    name: '',
    triggerType: 'review_due',
    quietHoursStart: null,
    quietHoursEnd: null,
    cooldownMinutes: 240,
    maxPerHour: 3,
  };
}

function RuleFormRow({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: AgentRuleForm;
  submitLabel: string;
  onSubmit: (form: AgentRuleForm) => void;
  onCancel: () => void;
}) {
  const t = useTranslations('workbench');
  const [form, setForm] = useState<AgentRuleForm>(initial);

  const set = <K extends keyof AgentRuleForm>(k: K, v: AgentRuleForm[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="mb-4 rounded-lg border border-[var(--border)] p-4">
      <Input
        className="mb-2"
        placeholder={t('agentRulesNamePlaceholder')}
        value={form.name}
        onChange={(e) => set('name', e.target.value)}
        aria-label={t('agentRulesNamePlaceholder')}
      />
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <select
          className="meta-mono rounded-md border border-[var(--border)] bg-[var(--muted)] px-2 py-1.5 text-[12px]"
          value={form.triggerType}
          onChange={(e) => set('triggerType', e.target.value)}
          aria-label={t('agentRulesTrigger')}
        >
          {TRIGGER_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {t(`inboxType${opt[0].toUpperCase()}${opt.slice(1).replace(/_(\w)/g, (_, c: string) => c.toUpperCase())}` as never)}
            </option>
          ))}
        </select>
        <Input
          className="w-[110px]"
          placeholder={t('agentRulesQuietFrom')}
          value={form.quietHoursStart ?? ''}
          onChange={(e) => set('quietHoursStart', e.target.value || null)}
          aria-label={t('agentRulesQuietFrom')}
        />
        <span className="meta-mono text-[12px] text-[var(--muted-foreground)]">→</span>
        <Input
          className="w-[110px]"
          placeholder={t('agentRulesQuietTo')}
          value={form.quietHoursEnd ?? ''}
          onChange={(e) => set('quietHoursEnd', e.target.value || null)}
          aria-label={t('agentRulesQuietTo')}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="meta-mono flex items-center gap-1.5 text-[12px] text-[var(--muted-foreground)]">
          {t('agentRulesCooldown')}
          <Input
            className="w-[90px]"
            type="number"
            min={0}
            value={form.cooldownMinutes}
            onChange={(e) => set('cooldownMinutes', Number(e.target.value) || 0)}
          />
        </label>
        <label className="meta-mono flex items-center gap-1.5 text-[12px] text-[var(--muted-foreground)]">
          {t('agentRulesMaxPerHour')}
          <Input
            className="w-[80px]"
            type="number"
            min={1}
            max={60}
            value={form.maxPerHour}
            onChange={(e) => set('maxPerHour', Number(e.target.value) || 1)}
          />
        </label>
      </div>
      <div className="mt-3 flex gap-2">
        <Button size="xs" onClick={() => onSubmit(form)}>
          {submitLabel}
        </Button>
        <Button size="xs" variant="ghost" onClick={onCancel}>
          {t('agentRulesCancel')}
        </Button>
      </div>
    </div>
  );
}

function RuleRow({
  rule,
  busy,
  onToggle,
  onDelete,
  onEdit,
}: {
  rule: AgentRule;
  busy: boolean;
  onToggle: (id: number, enabled: boolean) => void;
  onDelete: (id: number) => void;
  onEdit: (rule: AgentRule) => void;
}) {
  const t = useTranslations('workbench');
  const typeKey = `inboxType${rule.triggerType[0].toUpperCase()}${rule.triggerType
    .slice(1)
    .replace(/_(\w)/g, (_, c: string) => c.toUpperCase())}`;
  return (
    <li className="border-b border-[var(--border)] py-3 last:border-b-0" data-testid={`agent-rule-${rule.id}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium text-[var(--foreground)]">{rule.name}</p>
          <p className="meta-mono mt-0.5 text-[11px] text-[var(--muted-foreground)]">
            <span data-testid="rule-type">{t(typeKey as never)}</span>
            {rule.quietHoursStart && rule.quietHoursEnd
              ? ` · ${t('agentRulesQuiet')} ${rule.quietHoursStart}→${rule.quietHoursEnd}`
              : ''}
            {` · ${t('agentRulesCooldown')} ${rule.cooldownMinutes}min · ${t('agentRulesMaxPerHour')} ${rule.maxPerHour}`}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="xs" variant="ghost" disabled={busy} onClick={() => onEdit(rule)}>
            {t('agentRulesEdit')}
          </Button>
          <Button
            size="xs"
            variant={rule.enabled ? 'outline-danger' : 'ghost'}
            disabled={busy}
            onClick={() => onToggle(rule.id, !rule.enabled)}
          >
            {rule.enabled ? t('agentRulesDisable') : t('agentRulesEnable')}
          </Button>
          <Button
            size="xs"
            variant="ghost"
            aria-label={t('agentRulesDelete')}
            disabled={busy}
            onClick={() => onDelete(rule.id)}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </li>
  );
}

/** Agent 自动化规则管理面板 */
export default function AgentRulesPanel() {
  const t = useTranslations('workbench');
  const { rules, loading, error, busyId, createRule, updateRule, setEnabled, deleteRule, reload } =
    useAgentRules();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<AgentRule | null>(null);

  return (
    <div aria-busy={loading}>
      <div className="mb-4 flex items-center justify-between">
        <p className="meta-mono text-[12px] text-[var(--muted-foreground)]">
          {t('agentRulesHint')}
        </p>
        {!creating && !editing && (
          <Button size="xs" onClick={() => setCreating(true)}>
            <Plus className="mr-1 inline h-3.5 w-3.5" aria-hidden="true" />
            {t('agentRulesCreate')}
          </Button>
        )}
      </div>

      {error && (
        <p className="py-2 text-[12px] text-[var(--muted-foreground)]" role="alert">
          {error}
          <button type="button" className="ml-2 underline" onClick={() => void reload()}>
            {t('agentInboxRetry')}
          </button>
        </p>
      )}

      {creating && (
        <RuleFormRow
          initial={emptyForm()}
          submitLabel={t('agentRulesCreate')}
          onSubmit={(form) => {
            void createRule(form).then((ok) => ok && setCreating(false));
          }}
          onCancel={() => setCreating(false)}
        />
      )}
      {editing && (
        <RuleFormRow
          initial={{
            name: editing.name,
            triggerType: editing.triggerType,
            quietHoursStart: editing.quietHoursStart,
            quietHoursEnd: editing.quietHoursEnd,
            cooldownMinutes: editing.cooldownMinutes,
            maxPerHour: editing.maxPerHour,
          }}
          submitLabel={t('agentRulesSave')}
          onSubmit={(form) => {
            void updateRule(editing.id, form).then((ok) => ok && setEditing(null));
          }}
          onCancel={() => setEditing(null)}
        />
      )}

      {!loading && !error && rules.length === 0 && !creating && (
        <EmptyState
          label={t('agentRulesEmpty')}
          message={t('agentRulesEmptyHint')}
          className="py-10"
        />
      )}

      {rules.length > 0 && !editing && (
        <ul>
          {rules.map((r) => (
            <RuleRow
              key={r.id}
              rule={r}
              busy={busyId === r.id}
              onToggle={(id, en) => void setEnabled(id, en)}
              onDelete={(id) => void deleteRule(id)}
              onEdit={(rule) => setEditing(rule)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
