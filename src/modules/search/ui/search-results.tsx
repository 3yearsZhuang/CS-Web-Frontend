/**
 * @file 全站搜索分组结果渲染（供 /search 结果页使用）
 * 按 events/community/tools/announcements/users 顺序分组展示非空组。
 */
'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { NavMessageKey } from '@/i18n/types';
import type { SearchResponse, SearchScope } from '../types';

/** 分组渲染顺序 */
export const SEARCH_GROUP_ORDER: SearchScope[] = [
  'events',
  'community',
  'tools',
  'announcements',
  'users',
];

export function SearchResults({ response }: { response: SearchResponse }) {
  const t = useTranslations('nav');

  function groupLabel(g: SearchScope): string {
    if (g === 'all') return t('searchGroupAll');
    return t(
      `searchGroup${g.charAt(0).toUpperCase()}${g.slice(1)}` as NavMessageKey,
    );
  }

  const groups = SEARCH_GROUP_ORDER.map((g) => ({
    scope: g,
    label: groupLabel(g),
    items: response.results[g]?.items ?? [],
    total: response.results[g]?.total ?? 0,
  })).filter((g) => g.items.length > 0);

  if (groups.length === 0) {
    return (
      <div className="py-16 text-center">
        <div className="meta-mono text-[var(--muted-foreground)]">
          {t('searchNoResults')}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-12">
      {groups.map((g, idx) => (
        <section key={g.scope} aria-label={g.label}>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="meta-mono text-[var(--primary)] text-[13px]">
              {String(idx + 1).padStart(2, '0')}
            </span>
            <h2 className="display-serif text-[22px] text-[var(--foreground)]">
              {g.label}
            </h2>
            <span className="meta-mono text-[11px] text-[var(--muted-foreground)]">
              {g.total}
            </span>
          </div>

          <div className="border-t border-[var(--border)]">
            {g.items.map((item) => (
              <Link
                key={`${g.scope}-${item.id}`}
                href={item.url || '/'}
                className="group flex items-start gap-4 py-4 border-b border-[var(--border)] transition-colors hover:bg-[var(--primary)]/[0.03]"
              >
                <span className="meta-mono text-[10px] text-[var(--muted-foreground)] shrink-0 mt-0.5">
                  {item.type}
                </span>
                <div className="min-w-0">
                  <div className="text-[14px] text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors truncate">
                    {item.title}
                  </div>
                  {item.subtitle && (
                    <div className="mt-0.5 text-[12px] text-[var(--muted-foreground)] line-clamp-2">
                      {item.subtitle}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
