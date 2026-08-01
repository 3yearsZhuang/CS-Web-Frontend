/**
 * @file 版块详情 /community/forum/[category] — Tab 切换主题列表与版规
 * 主题筛选（全部/置顶/精华）+ 排序（最新/热门）
 */

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { type CapsuleTab } from '@/components/layout/floating-capsule-sidebar';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { ScrollIndicator } from '@/components/effects/scroll-indicator';
import { ForumTopicItem } from '@/modules/community/ui/forum-topic-item';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { Button, SectionLoading } from '@/components';
import type { ForumCategory, ForumTopic, PaginatedTopics } from '@/modules/community/types';

type CategoryTab = 'topics' | 'rules';
type FilterStatus = 'all' | 'pinned' | 'featured';
type SortMode = 'latest' | 'hot' | 'top';

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'pinned', label: '置顶' },
  { value: 'featured', label: '精华' },
];

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'latest', label: '最新' },
  { value: 'hot', label: '热门' },
  { value: 'top', label: '顶配' },
];

interface CategoriesResponse {
  items: ForumCategory[];
}

export default function CategoryPage() {
  const params = useParams<{ category: string }>();
  const router = useRouter();
  const slug = params?.category ?? '';

  // Hero 进入 1s 后自动收缩并悬浮于页首（动画期间锁定滚动）
  const { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick } = useCollapsingHero();

  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  };

  const [category, setCategory] = useState<ForumCategory | null>(null);
  const [topics, setTopics] = useState<ForumTopic[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<CategoryTab>('topics');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [sort, setSort] = useState<SortMode>('latest');

  const categoryTabs: CapsuleTab[] = [
    { key: 'topics', num: '01', label: '主题 / Topics' },
    { key: 'rules', num: '02', label: '规则 / Rules' },
  ];

  /** 加载版块信息 */
  useEffect(() => {
    let cancelled = false;
    fetch('/api/community/forum/categories')
      .then(async (res) => {
        if (!res.ok) throw new Error('加载失败');
        const data = (await res.json()) as CategoriesResponse;
        return data.items ?? [];
      })
      .then((cats) => {
        if (cancelled) return;
        const found = cats.find((c) => c.slug === slug) ?? null;
        if (!found) {
          setError('版块不存在');
          setLoading(false);
          return;
        }
        setCategory(found);
      })
      .catch(() => {
        if (cancelled) return;
        setError('加载失败');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  /** 加载主题列表 */
  const loadTopics = useCallback(async () => {
    if (!category) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('category', category.slug);
      params.set('page', String(page));
      params.set('page_size', String(PAGE_SIZE));
      params.set('sort', sort);
      const res = await fetch(`/api/community/forum/topics?${params.toString()}`);
      if (!res.ok) throw new Error('加载失败');
      const data = (await res.json()) as PaginatedTopics;
      let items = data.items ?? [];
      // 客户端筛选（后端暂未支持 pinned/featured 过滤）
      if (statusFilter === 'pinned') {
        items = items.filter((t) => t.isPinned);
      } else if (statusFilter === 'featured') {
        items = items.filter((t) => t.isFeatured);
      }
      setTopics(items);
      setTotalPages(data.totalPages ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, [category, page, sort, statusFilter]);

  useEffect(() => {
    if (category) void loadTopics();
  }, [category, loadTopics]);

  const pageNums = useMemo(() => {
    const arr: number[] = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    for (let i = start; i <= end; i++) arr.push(i);
    return arr;
  }, [page, totalPages]);

  if (loading && !category) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center">
        <SectionLoading label="Loading..." />
      </main>
    );
  }

  if (error && !category) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="meta-mono text-[var(--destructive)] mb-4">{error}</div>
          <Link href="/community" className="meta-mono text-[var(--primary)] underline-grow">
            返回论坛
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative pt-16">
      {/* ============ [ 00 ] Hero — 1s 后自动收缩悬浮 ============ */}
      <CollapsingHero
        index="00"
        label={category?.slug ?? 'category'}
        hero={hero}
        pageKey={`forum-${category?.slug ?? ''}`}
        minHeight="50vh"
        capsule={{
          tabs: categoryTabs,
          activeKey: activeTab,
          onTabChange: (key) => setActiveTab(key as CategoryTab),
        }}
        sidebarBottom={
          <Link
            href="/community"
            className="meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors inline-block mt-2 text-[11px]"
          >
            ← 返回
          </Link>
        }
      >
        <RevealTitle>
          <h1
            className={`display-serif text-[var(--foreground)] transition-all hero-reveal ${
              hero.collapsed
                ? 'cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2] mb-0'
                : 'text-[clamp(36px,7vw,88px)] leading-[1.05] mb-4'
            }`}
            onClick={hero.collapsed ? hero.onTitleClick : undefined}
          >
            {category?.name ?? '—'}
            <span
              className={`display-serif italic text-[var(--muted-foreground)] transition-all hero-reveal ${
                hero.collapsed
                  ? 'text-[clamp(12px,1.6vw,18px)] ml-2 align-baseline'
                  : 'text-[clamp(14px,2vw,24px)] ml-3 align-baseline'
              }`}
            >
              / {category?.slug ?? 'Category'}
            </span>
          </h1>
        </RevealTitle>

        <div
          className={`overflow-hidden transition-all hero-reveal ${
            hero.collapsed ? 'max-h-0 opacity-0' : 'max-h-[200px] opacity-100'
          }`}
        >
          {category?.description && (
            <RevealItem>
              <p className="max-w-2xl text-[var(--muted-foreground)] text-[15px] leading-[1.8] mb-6">
                {category.description}
              </p>
            </RevealItem>
          )}
        </div>

        <RevealItem>
          <div
            className={`flex items-end justify-between gap-6 sm:gap-10 pt-4 border-t border-[var(--border)] transition-all hero-reveal ${
              hero.collapsed ? 'pt-2 border-t-0' : ''
            }`}
          >
            <div className="flex gap-6 sm:gap-10">
              <div>
                <div className="meta-mono text-[10px] mb-1">Topics</div>
                <div
                  className={`font-mono text-[var(--foreground)] tabular-nums transition-all hero-reveal ${
                    hero.collapsed ? 'text-[14px]' : 'text-[24px]'
                  }`}
                >
                  {category?.topicCount ?? 0}
                </div>
              </div>
              <div>
                <div className="meta-mono text-[10px] mb-1">Posts</div>
                <div
                  className={`font-mono text-[var(--foreground)] tabular-nums transition-all hero-reveal ${
                    hero.collapsed ? 'text-[14px]' : 'text-[24px]'
                  }`}
                >
                  {category?.postCount ?? 0}
                </div>
              </div>
            </div>
            <Button
              onClick={() => router.push(`/community/forum/new?category=${category?.slug ?? ''}`)}
              className="flex-shrink-0"
            >
              发新主题 →
            </Button>
          </div>
        </RevealItem>
      </CollapsingHero>

      {/* ============ Tab 合并区 ============ */}
      <section className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto w-full md:pl-[72px] lg:pl-[88px]">
          {/* 右侧内容区 */}
          <div>
              {/* Tab 01 — Topics */}
              {activeTab === 'topics' && (
                <div>
                  <h2 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)] mb-10 sm:mb-16">
                    主题 <span className="text-[var(--primary)]">列表</span>
                  </h2>

                  {/* 筛选区 */}
                  <div className="border-t border-b border-[var(--border)] py-6 sm:py-8 mb-0">
                    <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                      {/* 状态筛选 */}
                      <div className="flex-shrink-0">
                        <div className="meta-mono mb-2">Filter</div>
                        <ScrollIndicator className="md:[&>*]:overflow-visible" gap="gap-0">
                          <div className="flex gap-0 -mx-4 px-4 md:mx-0 md:px-0">
                          {STATUS_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => {
                                setStatusFilter(opt.value);
                                setPage(1);
                              }}
                              className={`whitespace-nowrap px-4 py-2.5 text-[11px] font-mono uppercase tracking-wider border border-[var(--border)] transition-colors ${
                                statusFilter === opt.value
                                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]'
                                  : 'bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                          </div>
                        </ScrollIndicator>
                      </div>
                      {/* 排序 */}
                      <div className="flex-shrink-0 md:ml-auto">
                        <div className="meta-mono mb-2">Sort</div>
                        <div className="flex gap-0">
                          {SORT_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              onClick={() => {
                                setSort(opt.value);
                                setPage(1);
                              }}
                              className={`whitespace-nowrap px-4 py-2.5 text-[11px] font-mono uppercase tracking-wider border border-[var(--border)] transition-colors ${
                                sort === opt.value
                                  ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]'
                                  : 'bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 主题列表 */}
                  {loading ? (
                    <div className="py-16 text-center meta-mono text-[var(--muted-foreground)]">
                      Loading...
                    </div>
                  ) : error ? (
                    <div className="py-16 text-center meta-mono text-[var(--destructive)]">
                      {error}
                    </div>
                  ) : topics.length === 0 ? (
                    <div className="py-16 text-center">
                      <div className="meta-mono text-[var(--muted-foreground)] mb-6">
                        暂无主题，来发布第一条吧
                      </div>
                      <Link
                        href="/community/forum/new"
                        className="meta-mono text-[var(--primary)] underline-grow"
                      >
                        立即发帖 →
                      </Link>
                    </div>
                  ) : (
                    <div className="border-t border-[var(--border)]">
                      {topics.map((topic, idx) => (
                        <ForumTopicItem
                          key={topic.id}
                          topic={topic}
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
              )}

              {/* Tab 02 — Rules */}
              {activeTab === 'rules' && (
                <div>
                  <h2 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)] mb-10 sm:mb-16">
                    版块 <span className="text-[var(--primary)]">规则</span>
                  </h2>
                  <div className="border-t border-[var(--border)] py-8 space-y-6 max-w-2xl">
                    <div>
                      <div className="ark-divider mb-3">{'// 01 发帖'}</div>
                      <p className="text-[15px] leading-[1.8] text-[var(--foreground)]">
                        发帖前请先使用搜索功能，避免重复发帖。标题需简明扼要地描述问题或主题。
                      </p>
                    </div>
                    <div>
                      <div className="ark-divider mb-3">{'// 02 回复'}</div>
                      <p className="text-[15px] leading-[1.8] text-[var(--foreground)]">
                        回复需与主题相关，避免无意义的灌水。楼中楼用于对特定回复的进一步讨论。
                      </p>
                    </div>
                    <div>
                      <div className="ark-divider mb-3">{'// 03 内容'}</div>
                      <p className="text-[15px] leading-[1.8] text-[var(--foreground)]">
                        支持 Markdown 格式，可上传图片附件（≤2MB，单帖 ≤5 张）。代码请使用代码块包裹。
                      </p>
                    </div>
                    <div>
                      <div className="ark-divider mb-3">{'// 04 互动'}</div>
                      <p className="text-[15px] leading-[1.8] text-[var(--foreground)]">
                        可以点赞与收藏优质内容。@ 提及他人时请勿滥用，单帖最多 10 个提及。
                      </p>
                    </div>
                    <div>
                      <div className="ark-divider mb-3">{'// 05 审核'}</div>
                      <p className="text-[15px] leading-[1.8] text-[var(--foreground)]">
                        事后审核：发帖即发布，管理员有权隐藏/删除违规内容。请自觉遵守社区规范。
                      </p>
                    </div>
                  </div>
                </div>
              )}

              </div>
        </div>
      </section>
    </main>
  );
}
