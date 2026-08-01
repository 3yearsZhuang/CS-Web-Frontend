/**
 * @file 统一社区帖子页 /community/posts
 *
 * 合并原论坛主题与博客文章为统一「帖子」列表。通过 ?kind=topic|post（默认 all）
 * 与 ?category= 过滤；复用 FeedItemCard 统一渲染两种内容。
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { FeedItemCard } from '@/modules/community/ui/feed-item-card';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { Button, SectionLoading } from '@/components';
import { FilterBar } from '@/components/primitives/filter-bar';
import type { CommunityCategory, CommunityPost, FeedItem, PostKind } from '@/modules/community/types';

type TabKey = 'all' | 'topic' | 'post';

const PAGE_SIZE = 20;
const SEARCH_MIN_LEN = 2;
const SEARCH_MAX_LEN = 80;

const TAB_OPTIONS: { key: TabKey; num: string; label: string }[] = [
  { key: 'all', num: '01', label: '全部 / All' },
  { key: 'topic', num: '02', label: '论坛 / Forum' },
  { key: 'post', num: '03', label: '博客 / Blog' },
];

export default function PostsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialKind = (searchParams.get('kind') as TabKey) || 'all';
  const initialCategory = searchParams.get('category') ?? '';
  const initialSearch = searchParams.get('q') ?? '';

  const { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick } =
    useCollapsingHero();
  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  };

  const [activeTab, setActiveTab] = useState<TabKey>(initialKind);
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const syncUrl = useCallback(
    (kind: TabKey, cat: string, q: string, p: number) => {
      const params = new URLSearchParams();
      if (kind !== 'all') params.set('kind', kind);
      if (cat) params.set('category', cat);
      if (q.trim()) params.set('q', q.trim());
      if (p > 1) params.set('page', String(p));
      const qs = params.toString();
      router.replace(`/community/posts${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router],
  );

  useEffect(() => {
    fetch('/api/community/forum/categories')
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { items: CommunityCategory[] };
        setCategories(data.items ?? []);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('kind', activeTab);
      if (selectedCategory) params.set('category', selectedCategory);
      const q = searchQuery.trim();
      if (q.length >= SEARCH_MIN_LEN) params.set('search', q);
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));

      const res = await fetch(`/api/community/posts?${params.toString()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('加载失败');
      const json = (await res.json()) as {
        data:
          | { items: CommunityPost[]; total: number; totalPages: number }
          | { topics: { items: CommunityPost[] }; posts: { items: CommunityPost[] }; total: number };
      };
      const d = json.data;

      let merged: CommunityPost[] = [];
      let tPages = 1;
      if ('items' in d) {
        merged = d.items;
        tPages = d.totalPages ?? 1;
      } else {
        merged = [...d.topics.items, ...d.posts.items];
        tPages = 1;
      }

      const feedItems: FeedItem[] = merged.map((p) => ({
        kind: p.kind as PostKind,
        sortAt: p.updatedAt,
        data: p,
      }));
      setItems(feedItems);
      setTotalPages(tPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedCategory, searchQuery, page]);

  useEffect(() => {
    void load();
    syncUrl(activeTab, selectedCategory, searchQuery, page);
  }, [load, syncUrl, activeTab, selectedCategory, searchQuery, page]);

  const handleTabChange = (key: string) => {
    setActiveTab(key as TabKey);
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void load();
  };

  const pageNums = (() => {
    const max = totalPages;
    const cur = page;
    const range: number[] = [];
    const start = Math.max(1, Math.min(cur - 2, max - 4));
    const end = Math.min(max, start + 4);
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  })();

  if (loading && items.length === 0) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center">
        <SectionLoading label="Loading..." />
      </main>
    );
  }

  return (
    <main className="relative pt-16">
      <CollapsingHero
        index="00"
        label="Posts"
        hero={hero}
        pageKey="posts"
        capsule={{
          tabs: TAB_OPTIONS.map((t) => ({ key: t.key, num: t.num, label: t.label })),
          activeKey: activeTab,
          onTabChange: handleTabChange,
        }}
      >
        <RevealTitle>
          <h1
            className={`display-serif text-[var(--foreground)] transition-all hero-reveal ${
              hero.collapsed
                ? 'cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2]'
                : 'text-[clamp(36px,9vw,120px)] leading-[1.05] sm:leading-[0.95]'
            }`}
            onClick={hero.collapsed ? hero.onTitleClick : undefined}
          >
            社区<span className="text-[var(--primary)]">帖子</span>
          </h1>
        </RevealTitle>
        <RevealItem>
          <div
            className={`overflow-hidden transition-all hero-reveal ${
              hero.collapsed ? 'max-h-[14px] opacity-30 mt-1' : 'max-h-[200px] opacity-100 mt-8 sm:mt-12'
            }`}
          >
            <p className="max-w-2xl text-[var(--muted-foreground)] text-[15px] sm:text-[16px] leading-[1.8]">
              论坛主题与博客文章，统一聚合浏览。
            </p>
          </div>
        </RevealItem>
      </CollapsingHero>

      <section className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto w-full md:pl-[72px] lg:pl-[88px]">
          {/* 操作条：搜索 + 发帖 */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-10">
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                maxLength={SEARCH_MAX_LEN}
                placeholder="搜索帖子..."
                aria-label="搜索帖子"
                className="w-full px-4 py-3 bg-transparent border border-[var(--border)] text-[var(--foreground)] text-[14px] font-mono placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] transition-colors"
              />
            </form>
            <Link href="/community/forum/new" className="shrink-0">
              <Button>发布新帖 →</Button>
            </Link>
          </div>

          {/* 版块筛选 */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-10">
              <button
                onClick={() => {
                  setSelectedCategory('');
                  setPage(1);
                }}
                className={`meta-mono text-[12px] px-3 py-1.5 border transition-colors ${
                  selectedCategory === ''
                    ? 'border-[var(--primary)] text-[var(--primary)]'
                    : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                全部版块
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.slug);
                    setPage(1);
                  }}
                  className={`meta-mono text-[12px] px-3 py-1.5 border transition-colors ${
                    selectedCategory === cat.slug
                      ? 'border-[var(--primary)] text-[var(--primary)]'
                      : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {/* Tab */}
          <FilterBar
            options={TAB_OPTIONS.map((opt) => ({
              value: opt.key,
              label: opt.label.split(' / ')[0],
              num: opt.num,
            }))}
            value={activeTab}
            onChange={handleTabChange}
            showNumber
            className="hidden md:block mb-8"
          />

          {error && (
            <div className="mb-8 p-4 border-l-2 border-[var(--destructive)] text-[var(--destructive)] meta-mono">
              {error}
            </div>
          )}

          {/* 列表 */}
          {items.length === 0 && !loading ? (
            <div className="py-16 text-center meta-mono text-[var(--muted-foreground)]">
              {'// 暂无内容'}
            </div>
          ) : (
            <div className="border-t border-[var(--border)]">
              {items.map((item, idx) => (
                <FeedItemCard
                  key={`${item.kind}-${item.data.id}`}
                  item={item}
                  index={(page - 1) * PAGE_SIZE + idx + 1}
                />
              ))}
            </div>
          )}

          {/* 分页 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 py-8 mt-4 border-t border-[var(--border)]">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="meta-mono px-3 py-1.5 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors disabled:opacity-30 focus-amber"
              >
                ←
              </button>
              {pageNums.map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`font-mono text-[12px] px-3 py-1.5 border transition-colors focus-amber ${
                    page === n
                      ? 'border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/5'
                      : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)]'
                  }`}
                >
                  {String(n).padStart(2, '0')}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="meta-mono px-3 py-1.5 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors disabled:opacity-30 focus-amber"
              >
                →
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
