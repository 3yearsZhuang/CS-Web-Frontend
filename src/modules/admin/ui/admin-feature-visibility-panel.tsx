'use client';

/**
 * @file 功能组件可见性管理面板（/admin · feature-visibility Tab · root 专属）
 *
 * 展示全站受管组件（页面 / 框架 / 工作台 widget / 工具子功能 / 社区子功能）× 三类用户
 * （访客/成员/管理员）的可见性矩阵，逐组件保存。
 * 受管组件清单来自 registry（单一事实来源），与后端 DEFAULT_MODULES 对应。
 * 保存流程：二次确认弹窗（变更摘要）→ 两步验证码输入 → PUT 提交 → 审计留痕。
 * 复用 useFeatureVisibility（SWR 共享缓存）+ useToast；2FA 强校验与审计在后端。
 */

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Shield, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/components/feedback/toast';
import {
  useFeatureVisibility,
  DEFAULT_VISIBILITY,
  type VisibilityRule,
} from '@/shared/hooks/use-feature-visibility';
import {
  COMPONENT_GROUPS,
  COMPONENT_REGISTRY,
  type ComponentMeta,
} from '@/shared/feature-visibility/registry';
import { Button } from '@/components';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';

type UserField = 'guest' | 'member' | 'admin';

const USER_FIELDS: Array<{ field: UserField; labelKey: string }> = [
  { field: 'guest', labelKey: 'colGuest' },
  { field: 'member', labelKey: 'colMember' },
  { field: 'admin', labelKey: 'colAdmin' },
];

interface AdminFeatureVisibilityPanelProps {
  onForbidden: () => void;
}

export function AdminFeatureVisibilityPanel({ onForbidden }: AdminFeatureVisibilityPanelProps) {
  const t = useTranslations('adminFeatureVisibility');
  const { pushToast } = useToast();
  const { rules, isLoading, mutate } = useFeatureVisibility();

  // 本地草稿：仅记录与已保存值不同的组件
  const [drafts, setDrafts] = useState<Record<string, VisibilityRule>>({});
  // 待确认的修改（打开 2FA 弹窗）
  const [pending, setPending] = useState<{ key: string; rule: VisibilityRule } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const effectiveRule = (key: string): VisibilityRule =>
    drafts[key] ?? rules[key] ?? DEFAULT_VISIBILITY[key] ?? { guest: false, member: true, admin: true };

  const isDirty = (key: string): boolean => {
    const draft = drafts[key];
    if (!draft) return false;
    const saved = rules[key] ?? DEFAULT_VISIBILITY[key];
    return (
      draft.guest !== saved.guest ||
      draft.member !== saved.member ||
      draft.admin !== saved.admin
    );
  };

  const toggle = (key: string, field: UserField) => {
    setDrafts((prev) => {
      const current = prev[key] ?? rules[key] ?? DEFAULT_VISIBILITY[key];
      return { ...prev, [key]: { ...current, [field]: !current[field] } };
    });
  };

  const resetDraft = (key: string) => {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const openConfirm = (key: string) => {
    setPending({ key, rule: effectiveRule(key) });
    setTotpCode('');
  };

  const submitUpdate = async () => {
    if (!pending || !/^\d{6}$/.test(totpCode)) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/feature-visibility/${encodeURIComponent(pending.key)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guest: pending.rule.guest,
          member: pending.rule.member,
          admin: pending.rule.admin,
          totpCode,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; code?: string };

      if (res.status === 403) {
        onForbidden();
        return;
      }
      if (!res.ok) {
        pushToast('error', data?.error || t('updateFailed'));
        return;
      }

      pushToast('success', t('updateSuccess'));
      resetDraft(pending.key);
      setPending(null);
      setTotpCode('');
      await mutate();
    } catch {
      pushToast('error', t('updateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 py-16 justify-center">
        <span className="w-3 h-3 border border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        <span className="meta-mono text-[12px] text-[var(--muted-foreground)]">{t('loading')}</span>
      </div>
    );
  }

  const dirtyCount = COMPONENT_REGISTRY.filter((m) => isDirty(m.key)).length;

  return (
    <section className="space-y-8">
      {/* 头部说明 */}
      <header className="space-y-3">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-[var(--primary)]" />
          <h2 className="display-serif text-[24px] text-[var(--foreground)]">{t('title')}</h2>
        </div>
        <p className="text-[13px] text-[var(--muted-foreground)] leading-relaxed max-w-2xl">
          {t('description')}
        </p>
        <p className="meta-mono text-[11px] text-[var(--primary)]">{t('twoFactorNote')}</p>
      </header>

      {/* 可见性矩阵 — 按分组渲染 */}
      {COMPONENT_GROUPS.map((group) => {
        const items = COMPONENT_REGISTRY.filter((c) => c.group === group.id);
        if (items.length === 0) return null;
        return (
          <div key={group.id} className="space-y-3">
            {/* 分组标题 */}
            <div className="flex items-baseline gap-3">
              <h3 className="meta-mono text-[12px] text-[var(--primary)] uppercase tracking-wider">
                {group.label}
              </h3>
              <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                {group.labelEn}
              </span>
              <span className="flex-1 h-px bg-[var(--border)]" />
            </div>

            <div className="border border-[var(--border)]">
              {/* 表头 */}
              <div className="grid grid-cols-[1fr_repeat(3,minmax(0,1fr))_auto] gap-4 px-5 py-3 border-b border-[var(--border)] bg-[var(--muted)]/30">
                <span className="meta-mono text-[11px] text-[var(--muted-foreground)]">{t('colModule')}</span>
                {USER_FIELDS.map((u) => (
                  <span key={u.field} className="meta-mono text-[11px] text-[var(--muted-foreground)] text-center">
                    {t(u.labelKey)}
                  </span>
                ))}
                <span className="meta-mono text-[11px] text-[var(--muted-foreground)] w-20 text-right">
                  {t('colAction')}
                </span>
              </div>

              {/* 行 */}
              {items.map((m: ComponentMeta) => {
                const rule = effectiveRule(m.key);
                const dirty = isDirty(m.key);
                return (
                  <div
                    key={m.key}
                    className={`grid grid-cols-[1fr_repeat(3,minmax(0,1fr))_auto] gap-4 px-5 py-4 border-b border-[var(--border)] last:border-b-0 transition-colors ${
                      dirty ? 'bg-[var(--primary)]/[0.04]' : ''
                    }`}
                  >
                    {/* 组件名 + 描述 */}
                    <div className="min-w-0">
                      <div className="text-[13px] text-[var(--foreground)]">
                        {m.label}
                        <span className="ml-2 meta-mono text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">
                          {m.labelEn}
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--muted-foreground)] mt-0.5">{m.description}</div>
                    </div>

                    {/* 三态开关 */}
                    {USER_FIELDS.map((u) => {
                      const checked = rule[u.field];
                      return (
                        <label
                          key={u.field}
                          className="flex items-center justify-center gap-2 cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggle(m.key, u.field)}
                            className="accent-[var(--primary)] w-4 h-4"
                            aria-label={`${m.label} · ${t(u.labelKey)}`}
                          />
                          <span className="text-[11px] text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors flex items-center gap-1">
                            {checked ? (
                              <Eye className="w-3 h-3" />
                            ) : (
                              <EyeOff className="w-3 h-3 opacity-50" />
                            )}
                          </span>
                        </label>
                      );
                    })}

                    {/* 操作 */}
                    <div className="w-20 flex items-center justify-end gap-2">
                      {dirty && (
                        <button
                          onClick={() => resetDraft(m.key)}
                          className="meta-mono text-[11px] px-2 py-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors focus-amber"
                        >
                          {t('reset')}
                        </button>
                      )}
                      <button
                        onClick={() => openConfirm(m.key)}
                        disabled={!dirty}
                        className={`meta-mono text-[11px] px-3 py-1.5 border transition-colors focus-amber ${
                          dirty
                            ? 'border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--background)]'
                            : 'border-[var(--border)] text-[var(--muted-foreground)] opacity-50 cursor-not-allowed'
                        }`}
                      >
                        {t('save')}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {dirtyCount > 0 && (
        <p className="meta-mono text-[11px] text-[var(--muted-foreground)]">
          {t('pendingChanges', { count: dirtyCount })}
        </p>
      )}

      {/* ============ 二次确认 + 2FA 输入弹窗 ============ */}
      {pending && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => !submitting && setPending(null)}
        >
          <div
            className="w-full max-w-md bg-[var(--background)] border border-[var(--border)] p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="display-serif text-[20px] text-[var(--foreground)]">{t('confirmTitle')}</h3>

            {/* 变更摘要 */}
            <div className="space-y-2 border border-[var(--border)] p-4">
              <div className="text-[12px] text-[var(--muted-foreground)]">
                {t('confirmDesc', { module: moduleLabel(pending.key) })}
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2">
                {USER_FIELDS.map((u) => {
                  const saved = rules[pending.key] ?? DEFAULT_VISIBILITY[pending.key];
                  const newVal = pending.rule[u.field];
                  const changed = saved[u.field] !== newVal;
                  return (
                    <div key={u.field} className="text-center">
                      <div className="meta-mono text-[10px] text-[var(--muted-foreground)] mb-1">
                        {t(u.labelKey)}
                      </div>
                      <div
                        className={`text-[12px] ${changed ? 'text-[var(--primary)] font-semibold' : 'text-[var(--foreground)]'}`}
                      >
                        {newVal ? t('visible') : t('hidden')}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2FA 输入 */}
            <div className="space-y-2">
              <label htmlFor="fv-totp" className="meta-mono text-[11px] text-[var(--muted-foreground)]">
                {t('totpLabel')}
              </label>
              <input
                id="fv-totp"
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                maxLength={6}
                autoFocus
                disabled={submitting}
                className={`${INPUT_CLASS} w-full px-4 py-3 text-[14px] tracking-[0.5em] text-center`}
                placeholder={t('totpPlaceholder')}
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setPending(null)}
                disabled={submitting}
                className="meta-mono text-[12px] px-4 py-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors focus-amber"
              >
                {t('cancel')}
              </button>
              <Button
                variant="primary-outline"
                type="button"
                onClick={submitUpdate}
                disabled={submitting || !/^\d{6}$/.test(totpCode)}
              >
                {submitting ? t('saving') : t('confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/** 由组件 key 反查展示名 */
function moduleLabel(key: string): string {
  const m = COMPONENT_REGISTRY.find((x) => x.key === key);
  return m ? `${m.label} / ${m.labelEn}` : key;
}
