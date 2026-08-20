/**
 * @file Schema 配置驱动卡渲染器 — 六种卡型（count/list/progress/countdown/note/link）。
 * 全部复用 WorkbenchCard 外壳（标题头/角标/操作区/三态），数据由 useSchemaData 统一提供。
 * 复杂卡（SSE/状态机/音频/加密/复杂图形）不在此渲染，走手写组件。
 */
'use client';

import { useTranslations } from 'next-intl';
import { LinkIcon, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { WorkbenchCard } from '../workbench-card';
import {
  buildConfigFromDraft,
  cornerFor,
  EMPTY_DRAFT,
  validateSchemaConfig,
  type SchemaField,
  type SchemaFormDraft,
  type SchemaWidgetConfig,
} from './widget-schema';
import { pickByPath, useSchemaData } from './use-schema-data';
import { useSchemaWidgets } from './use-schema-widgets';
import { SchemaCardForm } from './schema-card-form';

function asText(v: unknown): string {
  if (v == null) return '';
  return typeof v === 'string' ? v : String(v);
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** 倒计时差：返回 { n, unitKey }，unitKey 为 workbench i18n key（daysLater/hoursLater/minutesLater） */
function diffToNow(target: string): { n: number; unitKey: string } | null {
  const t = new Date(target).getTime();
  if (Number.isNaN(t)) return null;
  const ms = Math.max(0, t - Date.now());
  const days = Math.floor(ms / 86_400_000);
  if (days > 0) return { n: days, unitKey: 'daysLater' };
  const hours = Math.floor(ms / 3_600_000);
  if (hours > 0) return { n: hours, unitKey: 'hoursLater' };
  return { n: Math.max(1, Math.floor(ms / 60_000)), unitKey: 'minutesLater' };
}

/** list 行 href 模板插值：{key} → 对应字段值 */
function interpolateHref(tpl: string, item: unknown): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => encodeURIComponent(asText(pickByPath(item, k))));
}

function CountBody({ config }: { config: SchemaWidgetConfig }) {
  const t = useTranslations('workbench');
  const { items, loading, error } = useSchemaData(config.data);
  return (
    <WorkbenchCard
      corner={cornerFor(config.type, config.corner)}
      title={config.title}
      loading={loading}
      error={error ? <p className="text-[13px] text-[var(--muted-foreground)]">{error}</p> : undefined}
      empty={!error && items.length === 0 ? t('schemaEmpty') : false}
    >
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-baseline gap-2">
          <span className="display-serif text-[clamp(32px,5vw,56px)] leading-none tabular-nums text-[var(--foreground)]">
            {items.length}
          </span>
          <span className="text-[13px] text-[var(--muted-foreground)]">{config.title}</span>
        </div>
      </div>
    </WorkbenchCard>
  );
}

function ListBody({ config }: { config: SchemaWidgetConfig }) {
  const t = useTranslations('workbench');
  const { items, loading, error } = useSchemaData(config.data);
  const fields: SchemaField[] = config.fields ?? [];
  return (
    <WorkbenchCard
      corner={cornerFor(config.type, config.corner)}
      title={config.title}
      loading={loading}
      error={error ? <p className="text-[13px] text-[var(--muted-foreground)]">{error}</p> : undefined}
      empty={!error && items.length === 0 ? t('schemaEmpty') : false}
    >
      <ul className="idx-rail flex-1 min-h-0 overflow-y-auto">
        {items.map((item, i) => {
          const rowHref = fields.find((f) => f.href)?.href;
          const href = rowHref ? interpolateHref(rowHref, item) : undefined;
          const content = (
            <>
              <span className="idx">{String(i + 1).padStart(2, '0')}</span>
              <div className="min-w-0 flex-1">
                <div className="idx-ttl truncate">{fields[0] ? asText(pickByPath(item, fields[0].key)) : ''}</div>
                {fields.length > 1 && (
                  <div className="idx-mt flex items-center gap-3">
                    {fields.slice(1).map((f) => (
                      <span key={f.key} className="k">
                        {f.label ? `${f.label} · ` : ''}
                        {asText(pickByPath(item, f.key))}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {href && <span className="idx-arw">→</span>}
            </>
          );
          return (
            <li key={i}>
              {href ? (
                <a href={href} className="contents">
                  {content}
                </a>
              ) : (
                content
              )}
            </li>
          );
        })}
      </ul>
    </WorkbenchCard>
  );
}

function ProgressBody({ config }: { config: SchemaWidgetConfig }) {
  const t = useTranslations('workbench');
  const { items, loading, error } = useSchemaData(config.data);
  const target = config.options?.target ?? 100;
  const value = items.length;
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const R = 52;
  const CIRC = 2 * Math.PI * R;
  const accent = config.options?.accent === 'destructive' ? 'var(--destructive)' : config.options?.accent === 'emerald' ? 'var(--chart-3, #1d9e75)' : 'var(--primary)';
  return (
    <WorkbenchCard
      corner={cornerFor(config.type, config.corner)}
      title={config.title}
      loading={loading}
      error={error ? <p className="text-[13px] text-[var(--muted-foreground)]">{error}</p> : undefined}
      empty={!error && items.length === 0 ? t('schemaEmpty') : false}
    >
      <div className="flex-1 flex items-center justify-center gap-4">
        <div className="relative w-[96px] aspect-square shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r={R} fill="none" stroke="var(--border)" strokeWidth="8" />
            <circle
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke={accent}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRC}
              strokeDashoffset={CIRC * (1 - pct / 100)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[20px] font-medium tabular-nums leading-none text-[var(--foreground)]">{pct}%</span>
            <span className="text-[11px] text-[var(--muted-foreground)] mt-1">{value}/{target}</span>
          </div>
        </div>
      </div>
    </WorkbenchCard>
  );
}

function CountdownBody({ config }: { config: SchemaWidgetConfig }) {
  const t = useTranslations('workbench');
  const { items, loading, error } = useSchemaData(config.data);
  const dateKey = config.options?.dateKey ?? 'due';
  // 当前时间入 state，挂载后定时刷新（渲染期不调 Date.now，React 编译器纯度要求）
  const [nowTs, setNowTs] = useState(() => 0);
  useEffect(() => {
    setNowTs(Date.now());
    const timer = setInterval(() => setNowTs(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const upcoming = useMemo(
    () =>
      items
        .filter((it) => {
          const raw = pickByPath(it, dateKey);
          return typeof raw === 'string' && !Number.isNaN(new Date(raw).getTime()) && new Date(raw).getTime() > nowTs;
        })
        .sort((a, b) => new Date(asText(pickByPath(a, dateKey))).getTime() - new Date(asText(pickByPath(b, dateKey))).getTime()),
    [items, dateKey, nowTs],
  );
  return (
    <WorkbenchCard
      corner={cornerFor(config.type, config.corner)}
      title={config.title}
      loading={loading}
      error={error ? <p className="text-[13px] text-[var(--muted-foreground)]">{error}</p> : undefined}
      empty={!error && upcoming.length === 0 ? t('schemaEmpty') : false}
    >
      <ul className="flex flex-col gap-2.5 flex-1 min-h-0 overflow-y-auto">
        {upcoming.slice(0, 3).map((exam, i) => {
          const diff = diffToNow(asText(pickByPath(exam, dateKey)));
          const title = asText(pickByPath(exam, 'title')) || asText(pickByPath(exam, 'name')) || `#${i + 1}`;
          return (
            <li key={i} className="flex items-baseline justify-between gap-3">
              {i === 0 && diff ? (
                <span className="display-serif text-[clamp(28px,4vw,40px)] leading-none text-[var(--foreground)] tabular-nums">
                  {diff.n}
                  <span className="text-[13px] text-[var(--muted-foreground)] ml-1.5">{t(diff.unitKey, { n: diff.n })}</span>
                </span>
              ) : (
                <span className="text-[13px] text-[var(--muted-foreground)]">
                  {diff ? `${diff.n} ${t(diff.unitKey, { n: diff.n })}` : '…'}
                </span>
              )}
              <span className="text-[12px] text-[var(--muted-foreground)] truncate max-w-[55%] text-right">{title}</span>
            </li>
          );
        })}
      </ul>
    </WorkbenchCard>
  );
}

interface NoteItem {
  id: string;
  content: string;
}

function NoteBody({ config }: { config: SchemaWidgetConfig }) {
  const t = useTranslations('workbench');
  const { items, setItems } = useSchemaData(config.data);
  const [draft, setDraft] = useState('');
  const add = useCallback(() => {
    const content = draft.trim();
    if (!content) return;
    setItems((prev) => [{ id: uid('n'), content }, ...prev]);
    setDraft('');
  }, [draft, setItems]);
  const remove = useCallback(
    (id: string) => setItems((prev) => prev.filter((n) => (n as NoteItem).id !== id)),
    [setItems],
  );
  return (
    <WorkbenchCard corner={cornerFor(config.type, config.corner)} title={config.title}>
      <div className="flex gap-2">
        <Input
          type="text"
          value={draft}
          placeholder={t('notePlaceholder')}
          className="flex-1 min-w-0"
          onKeyDown={(e) => {
            if (e.key === 'Enter') add();
          }}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button size="sm" variant="pixel" aria-label={t('addTask')} onClick={add}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>
      <ul className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-y-auto">
        {items.length === 0 && (
          <li className="text-[13px] text-[var(--muted-foreground)] py-3 text-center">…</li>
        )}
        {items.map((note) => {
          const n = note as NoteItem;
          return (
            <li
              key={n.id}
              className="flex items-center gap-2 px-3 py-2 rounded border border-[var(--border)] text-[13px] text-[var(--muted-foreground)] group"
            >
              <span className="flex-1 min-w-0 truncate">{n.content}</span>
              <button
                type="button"
                aria-label="delete"
                className="shrink-0 p-1 rounded opacity-50 hover:opacity-100 focus:opacity-100 hover:bg-[var(--border)] transition-opacity"
                onClick={() => remove(n.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          );
        })}
      </ul>
    </WorkbenchCard>
  );
}

function LinkBody({ config }: { config: SchemaWidgetConfig }) {
  const t = useTranslations('workbench');
  const { items, loading, error } = useSchemaData(config.data);
  return (
    <WorkbenchCard
      corner={cornerFor(config.type, config.corner)}
      title={config.title}
      loading={loading}
      error={error ? <p className="text-[13px] text-[var(--muted-foreground)]">{error}</p> : undefined}
      empty={!error && items.length === 0 ? t('schemaEmpty') : false}
    >
      <ul className="flex flex-col gap-1.5 flex-1 min-h-0 overflow-y-auto">
        {items.map((link, i) => {
          const l = link as { title?: unknown; href?: unknown; desc?: unknown };
          return (
            <li key={i}>
              <a
                href={asText(l.href) || '#'}
                target={asText(l.href)?.startsWith('http') ? '_blank' : undefined}
                rel="noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded border border-[var(--border)] hover:bg-[var(--border)]/40 transition-colors"
              >
                <LinkIcon className="w-3.5 h-3.5 shrink-0 text-[var(--primary)]" />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] text-[var(--foreground)] truncate">{asText(l.title)}</div>
                  {l.desc != null && (
                    <div className="text-[11px] text-[var(--muted-foreground)] truncate">{asText(l.desc)}</div>
                  )}
                </div>
                <span className="idx-arw">→</span>
              </a>
            </li>
          );
        })}
      </ul>
    </WorkbenchCard>
  );
}

/** 单张 schema 卡：按 type 分发 */
export function SchemaCard({ config }: { config: SchemaWidgetConfig }) {
  switch (config.type) {
    case 'count':
      return <CountBody config={config} />;
    case 'list':
      return <ListBody config={config} />;
    case 'progress':
      return <ProgressBody config={config} />;
    case 'countdown':
      return <CountdownBody config={config} />;
    case 'note':
      return <NoteBody config={config} />;
    case 'link':
      return <LinkBody config={config} />;
  }
}

/** 内置注册 widget：Schema 管理卡 — 表单 + 实时预览 + 已建卡列表三合一 */
export function SchemaWidgetRenderer() {
  const t = useTranslations('workbench');
  const { configs, add, remove } = useSchemaWidgets();

  const [draft, setDraft] = useState<SchemaFormDraft>(EMPTY_DRAFT);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);

  /** 由当前表单草稿构建的 config（用于实时预览，可能不合法） */
  const previewConfig = useMemo(() => {
    const cfg = buildConfigFromDraft(draft);
    return validateSchemaConfig(cfg).length === 0 ? cfg : null;
  }, [draft]);

  const patchDraft = useCallback((patch: Partial<SchemaFormDraft>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
    setErrors([]);
    setSaved(false);
  }, []);

  const save = useCallback(() => {
    const cfg = buildConfigFromDraft(draft);
    const errs = validateSchemaConfig(cfg);
    if (errs.length > 0) {
      setErrors(errs);
      setSaved(false);
      return;
    }
    const res = add(cfg);
    if (!res.ok) {
      setErrors(res.errors ?? ['配置无效']);
      setSaved(false);
      return;
    }
    setErrors([]);
    setSaved(true);
    setDraft(EMPTY_DRAFT);
  }, [draft, add]);

  return (
    <WorkbenchCard corner="SCH" title={t('schemaWidget')} className="gap-3">
      {/* 实时预览：draft 合法即渲染 */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="meta-mono text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
            {t('schemaPreview')}
          </span>
          {previewConfig && (
            <span className="text-[11px] text-emerald-600">{t('schemaPreviewLive')}</span>
          )}
        </div>
        {previewConfig ? (
          <div className="rounded border border-dashed border-[var(--border)] p-3">
            <SchemaCard config={previewConfig} />
          </div>
        ) : (
          <div className="rounded border border-dashed border-[var(--border)] p-4 text-center text-[12px] text-[var(--muted-foreground)]">
            {t('schemaPreviewHint')}
          </div>
        )}
      </div>

      {/* 表单 */}
      <SchemaCardForm draft={draft} onChange={patchDraft} onSave={save} errors={errors} saved={saved} />

      {/* 已建卡列表 */}
      {configs.length > 0 && (
        <ul className="flex flex-col gap-1 border-t border-[var(--border)] pt-3">
          {configs.map((cfg) => (
            <li key={cfg.id} className="flex items-center gap-2 text-[12px] text-[var(--muted-foreground)]">
              <span className="meta-mono text-[11px]">{cfg.id}</span>
              <span className="truncate flex-1">{cfg.title}</span>
              <button
                type="button"
                aria-label="delete schema card"
                className="shrink-0 p-1 rounded hover:bg-[var(--border)]"
                onClick={() => remove(cfg.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </WorkbenchCard>
  );
}
