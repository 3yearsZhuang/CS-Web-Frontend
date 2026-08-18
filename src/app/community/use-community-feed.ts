'use client';

/**
 * @file useCommunityFeed — 社区聚合首页共享状态与逻辑 Hook
 *
 * 从 `app/community/page.tsx` 拆出，遵循 GENERAL 2.2「展示与容器分离」、
 * 2.4「逻辑 > 150 行提为 Hook / 组件 > 500 行拆分」。各渲染子组件复用本 Hook 返回值。
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { apiRequest } from '@/shared/hooks/use-api-request';
import type {
  FeedItem,
  FeedKind,
  PaginatedFeed,
  FeedTag,
} from '@/modules/community/types';
import type { SafeUser } from '@/modules/admin/ui/types';
import type { CommunityCategory } from '@/modules/community/types';
import type { CommunityPost } from '@/modules/community/types';
import type { MemberItem } from '@/modules/community/types';

interface FeedStats {
  topicCount: number;
  postCount: number;
  memberCount: number;
}

type TabKey = 'all' | 'following' | FeedKind | 'mine' | 'admin';

const PAGE_SIZE = 20;
export const SEARCH_MIN_LEN = 2;
export const SEARCH_MAX_LEN = 80;

const TAB_OPTIONS: { key: TabKey; num: string; labelKey: string; requiresLogin?: boolean }[] = [
  { key: 'all', num: '01', labelKey: 'tabAll' },
  { key: 'following', num: '02', labelKey: 'tabFollowing' },
  { key: 'member', num: '03', labelKey: 'tabMember' },
  { key: 'mine', num: '04', labelKey: 'tabMine', requiresLogin: true },
];

const TAB_TO_KIND: Partial<Record<Exclude<TabKey, 'admin' | 'following'>, FeedKind | undefined>> = {
  all: undefined,
  member: 'member',
};

export function useCommunityFeed() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('community');

  const initialSearchQuery = searchParams.get('q') ?? '';
  const initialTab = (searchParams.get('tab') as TabKey) ?? 'all';

  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const meResult = await apiRequest<{ user: SafeUser }>('/api/auth/me', { cache: 'no-store' });
      if (cancelled) return;
      if (meResult.ok && meResult.data) {
        setIsLoggedIn(true);
        const user = meResult.data.user;
        setCurrentUserId(user.id);
        if ((user.role === 'admin' || user.role === 'root') && user.isActive) {
          setCurrentUser(user);
        }
      }
      setAuthChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const isAdmin = currentUser !== null;

  const { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick } = useCollapsingHero();

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  const communityTabs = [
    ...TAB_OPTIONS.filter((opt) => !opt.requiresLogin || isLoggedIn).map((opt) => ({
      key: opt.key,
      num: opt.num,
      label: t(opt.labelKey as Parameters<typeof t>[0]),
    })),
    ...(isAdmin ? [{ key: 'admin' as TabKey, num: '99', label: t('tabAdmin') }] : []),
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
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [hotTopics, setHotTopics] = useState<CommunityPost[]>([]);
  const [activeMembers, setActiveMembers] = useState<MemberItem[]>([]);
  const [featuredTopics, setFeaturedTopics] = useState<CommunityPost[]>([]);

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
    void (async () => {
      const [tagsResult, statsResult] = await Promise.all([
        apiRequest<{ tags: FeedTag[] }>('/api/community/tags'),
        apiRequest<FeedStats>('/api/community/feed?stats=1'),
      ]);
      if (tagsResult.ok) setTags(tagsResult.data?.tags ?? []);
      if (statsResult.ok) setStats(statsResult.data ?? null);
    })();
  }, []);

  /** 加载侧边栏数据（版块 + 热榜 + 活跃用户 + 精选） */
  useEffect(() => {
    void (async () => {
      const hotParams = new URLSearchParams();
      hotParams.set('sort', 'hot');
      hotParams.set('page_size', '8');
      const featParams = new URLSearchParams();
      featParams.set('page_size', '8');
      featParams.set('sort', 'latest');

      const [catResult, hotResult, membersResult, featResult] = await Promise.all([
        apiRequest<{ items: CommunityCategory[] }>('/api/community/categories'),
        apiRequest<{ items: CommunityPost[] }>(`/api/community/topics?${hotParams.toString()}`),
        apiRequest<{ members: MemberItem[] }>('/api/community/members?sort=active&limit=6'),
        apiRequest<{ items: CommunityPost[] }>(`/api/community/topics?${featParams.toString()}`),
      ]);
      if (catResult.ok) setCategories(catResult.data?.items ?? []);
      if (hotResult.ok) setHotTopics((hotResult.data?.items ?? []).slice(0, 6));
      if (membersResult.ok) setActiveMembers(membersResult.data?.members ?? []);
      if (featResult.ok) {
        const items = featResult.data?.items ?? [];
        setFeaturedTopics(items.filter((tt) => tt.isPinned || tt.isFeatured).slice(0, 6));
      }
    })();
  }, []);

  /** 加载 Feed */
  const loadFeed = useCallback(async () => {
    if (activeTab === 'mine') {
      // 「我的」标签页由 ProfileCommunityTab 自行加载数据，Feed 区不渲染列表
      setLoading(false);
      return;
    }
    if (activeTab === 'member' || activeTab === 'following') {
      if (!authChecked) return;
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
      if (activeTab === 'following') {
        params.set('feed', 'following');
      } else {
        const kind = (TAB_TO_KIND as Record<string, FeedKind | undefined>)[activeTab];
        if (kind) params.set('kind', kind);
        if (activeTab === 'all') params.set('exclude', 'member');
      }
      const q = searchQuery.trim();
      if (q.length >= SEARCH_MIN_LEN) params.set('search', q);
      if (selectedTag) params.set('tag', selectedTag);
      params.set('page', String(page));
      params.set('pageSize', String(PAGE_SIZE));

      const result = await apiRequest<PaginatedFeed>(`/api/community/feed?${params.toString()}`);
      if (result.status === 401 && (activeTab === 'following' || activeTab === 'member')) {
        setItems([]);
        setTotal(0);
        setTotalPages(0);
        setLoading(false);
        return;
      }
      if (!result.ok) {
        setError(result.error ?? '加载失败');
        setItems([]);
        setLoading(false);
        return;
      }
      const data = result.data;
      setItems(data?.items ?? []);
      setTotal(data?.total ?? 0);
      setTotalPages(data?.totalPages ?? 0);
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

  return {
    t,
    router,
    currentUser,
    currentUserId,
    isLoggedIn,
    authChecked,
    isAdmin,
    heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
    activeTab,
    communityTabs,
    items,
    total,
    totalPages,
    page,
    setPage,
    searchQuery,
    setSearchQuery,
    selectedTag,
    tags,
    stats,
    loading,
    error,
    categories,
    hotTopics,
    activeMembers,
    featuredTopics,
    searchInputRef,
    pageNums,
    hasSearch,
    isInitialLoading,
    handleTabChange,
    handleSearchSubmit,
    handleClearSearch,
    handleTagClick,
    PAGE_SIZE,
  };
}

export type CommunityFeedState = ReturnType<typeof useCommunityFeed>;
