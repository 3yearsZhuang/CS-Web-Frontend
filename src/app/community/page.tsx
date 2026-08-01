/**
 * @file 社区聚合首页 /community — 三栏布局：版块导航 + Feed 流 + 热榜/活跃用户
 * 用判别联合 FeedItem 统一渲染 topic/post/member，支持类型/搜索/标签三维度过滤
 */

'use client';

import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { FeedItemCard } from '@/modules/community/ui/feed-item-card';
import { CommunitySidebarNav } from '@/modules/community/ui/community-sidebar-nav';
import { CommunitySidebarTrending } from '@/modules/community/ui/community-sidebar-trending';
import { FeaturedTopicStrip } from '@/modules/community/ui/featured-topic-strip';
import { AdminForumPanel } from '@/modules/community/ui/forum-admin-panel';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { Button, SectionLoading } from '@/components';
import { FilterBar } from '@/components/primitives/filter-bar';
import type {
  FeedItem,
  FeedKind,
  PaginatedFeed,
  FeedTag,
} from '@/modules/community/types';
import type { SafeUser } from '@/modules/admin/ui/types';
import type { ForumCategory } from '@/modules/community/types';
import type { ForumTopic } from '@/modules/community/types';
import type { MemberItem } from '@/modules/community/types';

interface FeedStats {
  topicCount: number;
  postCount: number;
  memberCount: number;
}

type TabKey = 'all' | FeedKind | 'admin';

const PAGE_SIZE = 20;
const SEARCH_MIN_LEN = 2;
const SEARCH_MAX_LEN = 80;

const TAB_OPTIONS: { key: TabKey; num: string; label: string }[] = [
  { key: 'all', num: '01', label: '全部 / All' },
  { key: 'topic', num: '02', label: '论坛 / Forum' },
  { key: 'post', num: '03', label: '博客 / Blog' },
  { key: 'member', num: '04', label: '成员 / Members' },
];

const TAB_TO_KIND: Record<Exclude<TabKey, 'admin'>, FeedKind | undefined> = {
  all: undefined,
  topic: 'topic',
  post: 'post',
  member: 'member',
};

export default function CommunityPage() {
  return (
    <Suspense
      fallback={
        <main className="relative pt-16 min-h-screen flex items-center justify-center">
          <SectionLoading label="Loading..." />
        </main>
      }
    >
      <CommunityPageContent />
    </Suspense>
  );
}

function CommunityPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialSearchQuery = searchParams.get('q') ?? '';
  const initialTab = (searchParams.get('tab') as TabKey) ?? 'all';

  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => {
        if (res.status === 401) return null;
        if (!res.ok) return null;
        return res.json() as Promise<{ user: SafeUser }>;
      })
      .then((data) => {
        if (cancelled) return;
        if (data) {
          setIsLoggedIn(true);
          const user = data.user;
          if ((user.role === 'admin' || user.role === 'root') && user.isActive) {
            setCurrentUser(user);
          }
        }
        setAuthChecked(true);
      })
      .catch(() => {
        if (!cancelled) setAuthChecked(true);
      });
    return () => { cancelled = true; };
  }, []);

  const isAdmin = currentUser !== null;

  const { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick } =
    useCollapsingHero();

  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  };

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  const communityTabs = [
    ...TAB_OPTIONS.map((t) => ({
      key: t.key,
      num: t.num,
      label: t.label,
    })),
    ...(isAdmin ? [{ key: 'admin' as TabKey, num: '99', label: '管理 / Admin' }] : []),
  ];

  const [items, setItems] = useState<FeedItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tags, setTags] = useState<FeedTag[]>([]);
  const [stats, setStats] = useState<FeedStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 三栏布局数据
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [hotTopics, setHotTopics] = useState<ForumTopic[]>([]);
  const [activeMembers, setActiveMembers] = useState<MemberItem[]>([]);
  const [featuredTopics, setFeaturedTopics] = useState<ForumTopic[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  /** 同步 URL */
  const syncUrl = useCallback(
    (q: string, tab: TabKey, p: number, tag: string | null) => {
      const params = new URLSearchParams();
      if (q.trim()) params.set('q', q.trim());
      if (tab !== 'all') params.set('tab', tab);
      if (p > 1) params.set('page', String(p));
      if (tag) params.set('tag', tag);
      const qs = params.toString();
      router.replace(`/community${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router],
  );

  /** 加载聚合标签与统计 */
  useEffect(() => {
    fetch('/api/community/tags')
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        setTags(data.tags ?? []);
      })
      .catch(() => {
        /* 标签加载失败不阻塞 Feed */
      });

    fetch('/api/community/feed?stats=1')
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as FeedStats;
        setStats(data);
      })
      .catch(() => {
        /* 统计加载失败不阻塞 */
      });
  }, []);

  /** 加载侧边栏数据（版块 + 热榜 + 活跃用户） */
  useEffect(() => {
    // 版块列表
    fetch('/api/community/forum/categories')
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { items: ForumCategory[] };
        setCategories(data.items ?? []);
      })
      .catch(() => {});

    // 热榜
    const hotParams = new URLSearchParams();
    hotParams.set('sort', 'hot');
    hotParams.set('page_size', '8');
    fetch(`/api/community/forum/topics?${hotParams.toString()}`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { items: ForumTopic[] };
        setHotTopics((data.items ?? []).slice(0, 6));
      })
      .catch(() => {});

    // 活跃用户
    fetch('/api/members?sort=active&limit=6')
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { members: MemberItem[] };
        setActiveMembers(data.members ?? []);
      })
      .catch(() => {});

    // 精选/置顶
    const featParams = new URLSearchParams();
    featParams.set('page_size', '8');
    featParams.set('sort', 'latest');
    fetch(`/api/community/forum/topics?${featParams.toString()}`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { items: ForumTopic[] };
        const items = data.items ?? [];
        setFeaturedTopics(items.filter((t) => t.isPinned || t.isFeatured).slice(0, 6));
      })
      .catch(() => {});
  }, []);

  /** 加载 Feed */
  const loadFeed = useCallback(async () => {
    // "成员" tab 需登录，auth 检查未完成时保持 loading，未登录则不加载
    if (activeTab === 'member') {
      if (!authChecked) return; // 等 auth 检查完成
      if (!isLoggedIn) {
        setItems([]);
        setTotal(0);
        setTotalPages(0);
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      const kind = (TAB_TO_KIND as Record<string, FeedKind | undefined>)[activeTab];
      if (kind) params.set('kind', kind);
      // "全部" tab 排除成员，仅展示话题+博客
      if (activeTab === 'all') params.set('exclude', 'member');
      const q = searchQuery.trim();
      if (q.length >= SEARCH_MIN_LEN) params.set('search', q);
      if (selectedTag) params.set('tag', selectedTag);
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));

      const res = await fetch(`/api/community/feed?${params.toString()}`);
      if (!res.ok) throw new Error('加载失败');
      const data = (await res.json()) as PaginatedFeed;
      setItems(data.items ?? []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, selectedTag, page, isLoggedIn, authChecked]);

  useEffect(() => {
    void loadFeed();
    syncUrl(searchQuery, activeTab, page, selectedTag);
  }, [loadFeed, syncUrl, searchQuery, activeTab, page, selectedTag]);

  /** Tab 切换 */
  const handleTabChange = (key: string) => {
    setActiveTab(key as TabKey);
    setPage(1);
  };

  /** 搜索提交 */
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    void loadFeed();
  };

  /** 清空搜索 */
  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedTag(null);
    setPage(1);
    searchInputRef.current?.focus();
  };

  /** 点击标签 */
  const handleTagClick = (tag: string) => {
    setSelectedTag(tag === selectedTag ? null : tag);
    setPage(1);
  };

  /** 分页范围 */
  const pageNums = (() => {
    const max = totalPages;
    const cur = page;
    const range: number[] = [];
    const start = Math.max(1, Math.min(cur - 2, max - 4));
    const end = Math.min(max, start + 4);
    for (let i = start; i <= end; i++) range.push(i);
    return range;
  })();

  const hasSearch = searchQuery.trim().length >= SEARCH_MIN_LEN || !!selectedTag;
  const isInitialLoading = loading && items.length === 0;

  if (isInitialLoading) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center">
        <SectionLoading label="Loading..." />
      </main>
    );
  }

  return (
    <main className="relative pt-16">
      {/* ============ [ 00 ] Hero ============ */}
      <CollapsingHero
        index="00"
        label="Community"
        hero={hero}
        pageKey="forum"
        capsule={{
          tabs: communityTabs,
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
            汇聚<span className="text-[var(--primary)]">技术</span>
            <span
              className={`transition-all hero-reveal ${
                hero.collapsed
                  ? 'inline opacity-100 ml-1'
                  : 'block max-h-[1.5em] opacity-100'
              } overflow-hidden`}
            >
              的每一份声音。
            </span>
            <span
              className={`display-serif italic text-[var(--muted-foreground)] transition-all hero-reveal ${
                hero.collapsed
                  ? 'text-[clamp(12px,1.6vw,18px)] ml-2 align-baseline'
                  : 'text-[clamp(14px,2vw,24px)] ml-3 align-baseline'
              }`}
            >
              / Community
            </span>
          </h1>
        </RevealTitle>
        <RevealItem>
          <div
            className={`overflow-hidden transition-all hero-reveal ${
              hero.collapsed
                ? 'max-h-[14px] opacity-30 mt-1'
                : 'max-h-[200px] opacity-100 mt-8 sm:mt-12'
            }`}
          >
            <p
              className={`max-w-2xl text-[var(--muted-foreground)] leading-[1.8] line-clamp-1 transition-all hero-reveal ${
                hero.collapsed ? 'text-[9px]' : 'text-[15px] sm:text-[16px]'
              }`}
            >
              论坛主题、博客文章、社区成员，一站浏览。
              <span className="serif-italic text-[var(--foreground)]">
                让每个声音被听见，每篇文章被阅读，每位成员被看见
              </span>
              。
            </p>
          </div>
        </RevealItem>
      </CollapsingHero>

      {/* ============ Feed + 三栏布局 ============ */}
      <section className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto w-full">
          <div className="flex gap-0">
            {/* 左侧栏 — 版块导航（桌面端显示） */}
            <div className="hidden md:block w-[200px] lg:w-[220px] flex-shrink-0 md:pr-6 md:border-r md:border-[var(--border)]">
              <CommunitySidebarNav categories={categories} />
            </div>

            {/* 中间 — Feed 流 */}
            <div className="flex-1 md:px-6 lg:px-10 min-w-0">
              {/* 标题 + 统计 */}
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10 sm:mb-16">
                <div>
                  <h2 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)] mb-4">
                    {hasSearch ? '搜索结果' : '社区动态'}
                    {hasSearch && searchQuery.trim() && (
                      <span className="text-[var(--primary)] ml-2">「{searchQuery.trim()}」</span>
                    )}
                    {selectedTag && (
                      <span className="text-[var(--primary)] ml-2">#{selectedTag}</span>
                    )}
                  </h2>
                  <p className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)] text-[13px]">
                    {hasSearch
                      ? loading
                        ? '// 搜索中...'
                        : error
                          ? `// ${error}`
                          : `// 找到 ${total} 条结果`
                      : stats
                        ? `// ${stats.topicCount} 主题 · ${stats.postCount} 文章 · ${stats.memberCount} 成员`
                        : '// 聚合论坛、博客、成员的最新动态'}
                  </p>
                </div>
              </div>

              {/* 类型 Tab 按钮组 — 桌面端复用 FilterBar（移动端由 FloatingCapsuleSidebar 的 SectionNav 承载，避免重复） */}
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

              {/* 搜索条 */}
              <form onSubmit={handleSearchSubmit} className="mb-8">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setPage(1);
                      }}
                      maxLength={SEARCH_MAX_LEN}
                      placeholder="搜索主题 / 文章 / 成员..."
                      aria-label="搜索社区"
                      className="w-full px-4 py-4 bg-transparent border border-[var(--border)] text-[var(--foreground)] text-[16px] font-mono placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] focus-amber transition-colors pr-12"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        aria-label="清空搜索"
                        className="absolute right-3 top-1/2 -translate-y-1/2 meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors focus-amber w-6 h-6 flex items-center justify-center"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <Button
                    type="submit"
                    disabled={loading || searchQuery.trim().length < SEARCH_MIN_LEN}
                    className="disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {loading ? 'Searching...' : 'Search →'}
                  </Button>
                </div>
                {searchQuery.length > 0 && (
                  <div className="mt-2 meta-mono normal-case tracking-normal text-[var(--muted-foreground)] text-[11px]">
                    {searchQuery.length} / {SEARCH_MAX_LEN} chars
                  </div>
                )}
              </form>

              {/* 精选/置顶横滑区 — 仅在 all 或 topic Tab 且无搜索时显示 */}
              {!hasSearch && (activeTab === 'all' || activeTab === 'topic') && featuredTopics.length > 0 && (
                <FeaturedTopicStrip topics={featuredTopics} className="mb-8" />
              )}

              {/* 标签筛选条 */}
              {tags.length > 0 && !selectedTag && (
                <div className="mb-8">
                  <div className="meta-mono text-[11px] mb-3">
                    {'// 热门标签 — '}
                    <span className="text-[var(--primary)] tabular-nums">{tags.length}</span>
                    {' tags'}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.slice(0, 15).map((tag) => (
                      <button
                        key={tag.tag}
                        onClick={() => handleTagClick(tag.tag)}
                        className="meta-mono text-[11px] px-3 py-1.5 border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-colors focus-amber"
                      >
                        {tag.tag}
                        <span className="ml-1 opacity-50">
                          {tag.topicCount + tag.postCount + tag.memberCount}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {selectedTag && (
                <div className="mb-8 flex items-center gap-3">
                  <span className="meta-mono text-[11px] text-[var(--muted-foreground)]">
                    {'// 已选标签:'}
                  </span>
                  <button
                    onClick={() => handleTagClick(selectedTag)}
                    className="meta-mono text-[11px] px-3 py-1.5 border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] transition-colors focus-amber"
                  >
                    {selectedTag} ✕
                  </button>
                </div>
              )}

              {/* Feed 列表 */}
              {activeTab === 'member' && authChecked && !isLoggedIn ? (
                <div className="py-20 text-center border-t border-[var(--border)]">
                  <div className="meta-mono text-[var(--muted-foreground)] text-[14px] mb-3">
                    {'// LOGIN REQUIRED'}
                  </div>
                  <div className="display-serif text-[clamp(20px,3vw,28px)] text-[var(--foreground)] mb-2">
                    成员列表仅对登录用户开放
                  </div>
                  <div className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)] text-[13px] mb-8">
                    登录后查看社区成员的技术标签与活跃动态
                  </div>
                  <Button onClick={() => router.push('/login?redirect=/community?tab=member')}>
                    登录 / Login →
                  </Button>
                </div>
              ) : loading ? (
                <SectionLoading label={hasSearch ? 'Searching...' : 'Loading...'} />
              ) : error ? (
                <div className="py-16 text-center">
                  <div className="meta-mono text-[var(--destructive)] mb-6">{error}</div>
                  <button
                    onClick={() => window.location.reload()}
                    className="meta-mono text-[var(--primary)] underline-grow"
                  >
                    重试
                  </button>
                </div>
              ) : items.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="meta-mono text-[var(--muted-foreground)] mb-6">
                    {hasSearch ? '// 没有找到匹配的内容' : '// 社区暂无内容'}
                  </div>
                  {hasSearch && (
                    <button
                      onClick={handleClearSearch}
                      className="meta-mono text-[var(--primary)] underline-grow"
                    >
                      清空筛选 ←
                    </button>
                  )}
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

              {/* Tab 99 — 论坛管理（仅管理员） */}
              {activeTab === 'admin' && currentUser && (
                <div>
                  <AdminForumPanel />
                </div>
              )}
            </div>

            {/* 右侧栏 — 仪表盘 + 热榜 + 活跃用户（桌面端显示） */}
            <div className="hidden md:block w-[220px] lg:w-[260px] flex-shrink-0 md:pl-6 md:border-l md:border-[var(--border)]">
              <CommunitySidebarTrending
                hotTopics={hotTopics}
                activeMembers={activeMembers}
                stats={
                  stats
                    ? {
                        todayTopics: stats.topicCount,
                        activeUsers: stats.memberCount,
                        onlineUsers: 0,
                      }
                    : null
                }
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
