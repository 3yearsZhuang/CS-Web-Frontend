/**
 * @file 组件注册表 — 应用外壳（左侧列表 + 右侧详情，移动端垂直布局）
 */

'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { LayoutGrid } from 'lucide-react';
import type { MigrationStatus } from '../types';
import {
  STATUS_CONFIG,
  STATUS_FALLBACK,
  getStatusConfig,
  STATUS_ORDER,
  CATEGORY_CONFIG,
} from '../types';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { SectionLoading } from '@/components';
import { ComponentRegistryStoreProvider, useComponentRegistryStore } from './component-registry-store';
import { ComponentRegistryDrawer } from './component-registry-drawer';
import { ComponentDetailPanel } from './component-registry-detail';

/* ============= 类型 ============= */

/** 筛选状态 */
export interface FilterState {
  category: string | null;
  migrationStatus: MigrationStatus | null;
}

const DEFAULT_FILTER: FilterState = {
  category: null,
  migrationStatus: null,
};

// 分类 key → i18n key（对应 toolsAdmin 的 categoryUiPrimitives/Feedback/Overlays/Layout）
const CATEGORY_LABEL_KEY: Record<string, string> = {
  'ui-primitives': 'categoryUiPrimitives',
  feedback: 'categoryFeedback',
  overlays: 'categoryOverlays',
  layout: 'categoryLayout',
};

/* ============= 内部组件 ============= */

function ShellContent({ embedded = false }: { embedded?: boolean }) {
  const t = useTranslations('toolsAdmin');
  const { state } = useComponentRegistryStore();
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const hero = useCollapsingHero();
  const heroState: HeroState = {
    collapsed: hero.collapsed,
    capsuleVisible: hero.capsuleVisible,
    onRevealComplete: hero.onRevealComplete,
    onTitleClick: hero.onTitleClick,
  };

  // 计算可见组件列表
  const filteredComponents = useMemo(() => {
    const list = [...state.components];
    return list
      .filter((c) => filter.category === null || c.category === filter.category)
      .filter((c) => filter.migrationStatus === null || c.migrationStatus === filter.migrationStatus)
      .sort((a, b) => {
        // 先按状态排序（legacy → migrating → done）
        const statusDiff = STATUS_ORDER.indexOf(a.migrationStatus) - STATUS_ORDER.indexOf(b.migrationStatus);
        if (statusDiff !== 0) return statusDiff;
        // 再按分类排序
        const catA = CATEGORY_CONFIG[a.category]?.order ?? 99;
        const catB = CATEGORY_CONFIG[b.category]?.order ?? 99;
        if (catA !== catB) return catA - catB;
        // 最后按名称排序
        return a.name.localeCompare(b.name);
      });
  }, [state.components, filter]);

  // 提取分类列表
  const categories = useMemo(() => {
    const set = new Set(state.components.map((c) => c.category));
    return Array.from(set).sort(
      (a, b) => (CATEGORY_CONFIG[a]?.order ?? 99) - (CATEGORY_CONFIG[b]?.order ?? 99),
    );
  }, [state.components]);

  // 选中组件
  const selectedItem = useMemo(
    () => (selectedId ? state.components.find((c) => c.id === selectedId) ?? null : null),
    [state.components, selectedId],
  );

  // 统计
  const stats = useMemo(() => {
    let legacy = 0;
    let migrating = 0;
    let done = 0;
    for (const c of state.components) {
      if (c.migrationStatus === 'legacy') legacy++;
      else if (c.migrationStatus === 'migrating') migrating++;
      else done++;
    }
    return { total: state.components.length, legacy, migrating, done };
  }, [state.components]);

  const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <>
      {/* ============ [ 00 ] Hero（嵌入模式跳过） ============ */}
      {!embedded && (
        <main className="relative pt-16">
          <CollapsingHero
          index="00"
          label={t('registryName')}
          hero={heroState}
          pageKey="component-registry"
          minHeight="50vh"
        >
          <RevealTitle>
            <h1
              className={`display-serif text-[var(--foreground)] transition-all hero-reveal ${
                heroState.collapsed
                  ? 'cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2]'
                  : 'text-[clamp(36px,9vw,120px)] leading-[1.05] sm:leading-[0.95]'
              }`}
              onClick={heroState.collapsed ? heroState.onTitleClick : undefined}
            >
              组件注册表
              <span
                className={`display-serif italic text-[var(--muted-foreground)] transition-all hero-reveal ${
                  heroState.collapsed
                    ? 'text-[clamp(12px,1.6vw,18px)] ml-2 align-baseline'
                    : 'text-[clamp(14px,2vw,24px)] ml-3 align-baseline'
                }`}
              >
                / Component Registry
              </span>
            </h1>
          </RevealTitle>
          <RevealItem>
            <div
              className={`overflow-hidden transition-all hero-reveal ${
                heroState.collapsed
                  ? 'max-h-[14px] opacity-30 mt-1'
                  : 'max-h-[200px] opacity-100 mt-8 sm:mt-12'
              }`}
            >
              <p
                className={`max-w-2xl text-[var(--muted-foreground)] leading-[1.8] line-clamp-1 transition-all hero-reveal ${
                  heroState.collapsed ? 'text-[9px]' : 'text-[15px] sm:text-[16px]'
                }`}
              >
                {t('registryHeroStats', { total: stats.total, done: stats.done, progress })}
                <span className="serif-italic text-[var(--foreground)]">
                  {t('registryHeroTagline')}
                </span>
                。
              </p>
            </div>
          </RevealItem>
        </CollapsingHero>
      </main>
      )}

      {/* ============ [ 01 ] 主内容区 ============ */}
      <section
        data-section-nav="01|主内容区"
        className={embedded ? '' : 'px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]'}
      >
        <div className={embedded ? '' : 'max-w-[1600px] mx-auto w-full md:pl-[72px] lg:pl-[88px]'}>
          {state.loading ? (
            <SectionLoading label={t('loadingComponents')} />
          ) : state.error ? (
            <div className="p-8 border border-red-500/30 text-center">
              <p className="text-red-500 text-sm">{state.error}</p>
            </div>
          ) : (
            <>
              {/* ===== 筛选栏 ===== */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                {/* 分类筛选 */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="meta-mono text-[10px] text-[var(--muted-foreground)] uppercase mr-1">
                    {t('categoryLabel')}
                  </span>
                  <button
                    onClick={() => setFilter((f) => ({ ...f, category: null }))}
                    className={`px-2.5 py-1 border meta-mono text-[10px] transition-colors ${
                      filter.category === null
                        ? 'bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]'
                        : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    {t('all')}
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setFilter((f) => ({ ...f, category: cat }))}
                      className={`px-2.5 py-1 border meta-mono text-[10px] transition-colors ${
                        filter.category === cat
                          ? 'bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]'
                          : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      {t(CATEGORY_LABEL_KEY[cat] ?? cat)}
                    </button>
                  ))}
                </div>

                {/* 状态筛选 */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="meta-mono text-[10px] text-[var(--muted-foreground)] uppercase mr-1">
                    {t('statusLabel')}
                  </span>
                  <button
                    onClick={() => setFilter((f) => ({ ...f, migrationStatus: null }))}
                    className={`px-2.5 py-1 border meta-mono text-[10px] transition-colors ${
                      filter.migrationStatus === null
                        ? 'bg-[var(--foreground)] text-[var(--background)] border-[var(--foreground)]'
                        : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    {t('all')}
                  </button>
                  {STATUS_ORDER.map((s) => (
                    <button
                      key={s}
                      onClick={() => setFilter((f) => ({ ...f, migrationStatus: s }))}
                      className={`px-2.5 py-1 border meta-mono text-[10px] transition-colors ${
                        filter.migrationStatus === s
                          ? `${STATUS_CONFIG[s].bg} ${STATUS_CONFIG[s].color} border-current`
                          : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      {STATUS_CONFIG[s].label}
                    </button>
                  ))}
                </div>

                {/* 统计 + 重置 */}
                <div className="flex items-center gap-2 ml-auto">
                  <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                    {filteredComponents.length}/{stats.total}
                  </span>
                  {(filter.category !== null || filter.migrationStatus !== null) && (
                    <button
                      onClick={() => setFilter(DEFAULT_FILTER)}
                      className="px-2 py-1 border border-[var(--border)] meta-mono text-[9px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors uppercase"
                    >
                      {t('reset')}
                    </button>
                  )}
                </div>
              </div>

              {/* ===== 双栏布局 ===== */}
              <div className="flex flex-col md:flex-row gap-0 border border-[var(--border)]">
                {/* ===== 左侧：组件列表 ===== */}
                <div className="md:w-[320px] lg:w-[360px] shrink-0 border-b md:border-b-0 md:border-r border-[var(--border)]">
                  {/* 列表头 */}
                  <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
                    <LayoutGrid className="w-3.5 h-3.5 text-[var(--primary)]" />
                    <span className="meta-mono text-[10px] text-[var(--primary)] uppercase">
                      {t('componentList')}
                    </span>
                  </div>

                  {/* 列表内容 */}
                  <div className="overflow-y-auto max-h-[calc(100vh-420px)]">
                    {filteredComponents.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <span className="meta-mono text-[10px] text-[var(--muted-foreground)]/50 uppercase">
                          {t('noMatch')}
                        </span>
                      </div>
                    ) : (
                      filteredComponents.map((item) => {
                        const st = getStatusConfig(item.migrationStatus);
                        const isSelected = selectedId === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setSelectedId(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors border-b border-[var(--border)] ${
                              isSelected
                                ? 'bg-[var(--primary)]/[0.05] border-l-[3px] border-l-[var(--primary)] pl-[13px]'
                                : 'hover:bg-[var(--primary)]/[0.02] border-l-[3px] border-l-transparent pl-[13px]'
                            }`}
                          >
                            {/* 状态圆点 */}
                            <div className={`w-2 h-2 rounded-full shrink-0 ${st.bg} ring-1 ring-current ${st.color}`} />

                            {/* 名称 + 分类 */}
                            <div className="min-w-0 flex-1">
                              <div className="text-[13px] text-[var(--foreground)] truncate">
                                {item.name}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="meta-mono text-[9px] text-[var(--muted-foreground)]">
                                  {t(CATEGORY_LABEL_KEY[item.category] ?? item.category)}
                                </span>
                                <span className={`meta-mono text-[9px] ${st.color}`}>
                                  {st.label}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* ===== 右侧：详情面板 ===== */}
                <div className="flex-1 min-w-0">
                  <ComponentDetailPanel
                    item={selectedItem}
                    onOpenDrawer={setEditingItemId}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ============ 编辑抽屉 ============ */}
      <ComponentRegistryDrawer
        itemId={editingItemId}
        onClose={() => setEditingItemId(null)}
      />
    </>
  );
}

/* ============= 对外导出 ============= */

/** 组件注册表应用外壳（左侧列表 + 右侧详情） */
export function ComponentRegistryShell({ embedded = false }: { embedded?: boolean } = {}) {
  return (
    <ComponentRegistryStoreProvider>
      <ShellContent embedded={embedded} />
    </ComponentRegistryStoreProvider>
  );
}