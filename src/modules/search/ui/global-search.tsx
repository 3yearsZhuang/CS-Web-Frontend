/**
 * @file 顶栏全站搜索 — 路由感知范围 + 防抖即时下拉结果（hero 全站 / 模块页单模块）
 * 键盘：↑↓ 选择、Enter 跳转、Esc 关闭；点击外部关闭。
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';
import type { NavMessageKey } from '@/i18n/types';
import { useGlobalSearch, SEARCH_MIN_CHARS } from './hooks/use-global-search';
import type { SearchResultItem, SearchScope } from '../types';

/** 分组渲染顺序 */
const GROUP_ORDER: SearchScope[] = ['events', 'community', 'tools', 'announcements', 'users'];

/** 路由 → 搜索范围：hero 全站，模块页仅对应模块，其余全站 */
function scopeForPath(pathname: string): SearchScope {
  if (pathname === '/') return 'all';
  if (pathname.startsWith('/events')) return 'events';
  if (pathname.startsWith('/community')) return 'community';
  if (pathname.startsWith('/tools')) return 'tools';
  if (pathname.startsWith('/users')) return 'users';
  return 'all';
}

interface GlobalSearchProps {
  /** 宽度控制：navbar 桌面版传 md:w-64；移动抽屉版传 w-full */
  className?: string;
}

export function GlobalSearch({ className = 'w-full md:w-64' }: GlobalSearchProps) {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const router = useRouter();

  const scope = useMemo(() => scopeForPath(pathname), [pathname]);
  const { query, setQuery, response, loading, hasResults, clear } = useGlobalSearch({ scope });

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 路由变化（跳转后）关闭下拉
  useEffect(() => {
    setOpen(false);
    setActiveIndex(-1);
  }, [pathname]);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  // Esc 关闭（绑定在输入框上）
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter')) {
        setOpen(true);
      }
    },
    [open],
  );

  /** 全部可见项扁平化（含所属分组），供键盘导航索引 */
  const flatItems = useMemo(() => {
    if (!response) return [] as Array<{ item: SearchResultItem; group: SearchScope }>;
    const list: Array<{ item: SearchResultItem; group: SearchScope }> = [];
    for (const g of GROUP_ORDER) {
      for (const item of response.results[g]?.items ?? []) list.push({ item, group: g });
    }
    return list;
  }, [response]);

  const activeQuery = query.trim();
  const showPanel = open && activeQuery.length >= SEARCH_MIN_CHARS;

  function groupLabel(g: SearchScope): string {
    if (g === 'all') return t('searchGroupAll');
    return t(`searchGroup${g.charAt(0).toUpperCase()}${g.slice(1)}` as NavMessageKey);
  }

  const scopeLabel = groupLabel(scope);

  function go(url: string) {
    setOpen(false);
    setActiveIndex(-1);
    router.push(url);
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {/* 输入框 + scope 徽标 */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActiveIndex(-1);
            if (!open) setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          maxLength={80}
          placeholder={
            scope === 'all' ? t('searchPlaceholder') : t('searchPlaceholderModule', { scope: scopeLabel })
          }
          aria-label={t('searchAria')}
          aria-expanded={showPanel}
          aria-controls="global-search-results"
          autoComplete="off"
          className={`${INPUT_CLASS} w-full px-3 py-1.5 text-[12px] pr-16`}
        />
        {/* scope 徽标（右侧） */}
        <span className="absolute right-2 top-1/2 -translate-y-1/2 meta-mono text-[10px] text-[var(--muted-foreground)] pointer-events-none">
          [{scopeLabel}]
        </span>
      </div>

      {/* 下拉结果面板 */}
      {showPanel && (
        <div
          id="global-search-results"
          role="listbox"
          aria-label={t('searchAria')}
          className="absolute left-0 right-0 top-full mt-1 z-[var(--z-header)] bg-[var(--background)] border border-[var(--border)] shadow-[var(--shadow-modal)] overflow-hidden"
        >
          {loading ? (
            <div className="px-4 py-3 meta-mono text-[11px] text-[var(--muted-foreground)]">
              {t('searchLoading')}
            </div>
          ) : !hasResults ? (
            <div className="px-4 py-3 meta-mono text-[11px] text-[var(--muted-foreground)]">
              {t('searchNoResults')}
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              {GROUP_ORDER.map((g) => {
                const group = response?.results[g];
                const items = group?.items ?? [];
                if (items.length === 0) return null;
                return (
                  <div key={g} role="presentation">
                    <div className="px-4 pt-2.5 pb-1 meta-mono text-[10px] uppercase tracking-wider text-[var(--primary)]">
                      {groupLabel(g)}
                    </div>
                    {items.map((item) => {
                      const idx = flatItems.findIndex(
                        (f) => f.item.id === item.id && f.group === g,
                      );
                      const active = idx === activeIndex;
                      return (
                        <button
                          key={`${g}-${item.id}`}
                          type="button"
                          role="option"
                          aria-selected={active}
                          onMouseDown={(e) => {
                            // 阻止 blur 提前关闭下拉，保证点击跳转
                            e.preventDefault();
                            go(item.url || '/');
                          }}
                          onMouseEnter={() => setActiveIndex(idx)}
                          className={`w-full text-left px-4 py-2 border-l-2 transition-colors ${
                            active
                              ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                              : 'border-transparent'
                          }`}
                        >
                          <div className="flex items-baseline gap-2 min-w-0">
                            <span className="meta-mono text-[10px] text-[var(--muted-foreground)] shrink-0">
                              {item.type}
                            </span>
                            <span className="text-[12px] text-[var(--foreground)] truncate">
                              {item.title}
                            </span>
                          </div>
                          {item.subtitle && (
                            <div className="mt-0.5 text-[11px] text-[var(--muted-foreground)] truncate">
                              {item.subtitle}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
              {/* 无匹配组时兜底提示 */}
              {!loading && hasResults && flatItems.length === 0 && (
                <div className="px-4 py-3 meta-mono text-[11px] text-[var(--muted-foreground)]">
                  {t('searchNoResults')}
                </div>
              )}
            </div>
          )}
          {/* 展开按钮 → 全站结果页（A） */}
          {!loading && hasResults && (
            <div className="border-t border-[var(--border)]">
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  go(`/search?q=${encodeURIComponent(activeQuery)}&scope=all`);
                }}
                className="w-full px-4 py-2.5 text-left meta-mono text-[11px] text-[var(--primary)] hover:bg-[var(--primary)]/[0.04] transition-colors"
              >
                {t('searchViewAll')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
