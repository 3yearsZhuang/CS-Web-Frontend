'use client';

/**
 * @file useCommunityFeed — 社区聚合首页共享状态与逻辑 Hook
 *
 * 从 `app/community/page.tsx` 拆出，遵循 GENERAL 2.2「展示与容器分离」、
 * 2.4「逻辑 > 150 行提为 Hook / 组件 > 500 行拆分」。各渲染子组件复用本 Hook 返回值。
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { apiRequest } from '@/shared/hooks/use-api-request';
import { useAuth } from '@/shared/hooks/use-auth';
import type {
  FeedItem,
  FeedKind,
  PaginatedFeed,
} from '@/modules/community/types';
import type { SafeUser } from '@/modules/admin/ui/types';
import type { CommunityCategory } from '@/modules/community/types';
import type { CommunityPost } from '@/modules/community/types';
import type { MemberItem } from '@/modules/community/types';

type TabKey = 'all' | 'following' | FeedKind | 'mine' | 'admin';
export type CommunitySort = 'latest' | 'hot' | 'top';

const PAGE_SIZE = 20;

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

  const tabParam = searchParams.get('tab');
  const initialTab: TabKey =
    tabParam === 'following' || tabParam === 'member' || tabParam === 'mine' || tabParam === 'admin'
      ? tabParam
      : 'all';
  const initialSort = (searchParams.get('sort') as CommunitySort) ?? 'latest';

  // 复用全局 SWR 化的 /api/auth/me（根布局已 SSR 注水）——不再单独发起一次请求
  const { user: authUser, loading: authLoading } = useAuth();
  const authRecord = authUser as (SafeUser & { isActive?: boolean }) | null;
  const isLoggedIn = !!authUser;
  const currentUserId = authUser?.id ?? null;
  // 仅管理员/root 且启用中的账号视为管理视图可用（与既有判定一致）
  const currentUser =
    authRecord &&
    (authRecord.role === 'admin' || authRecord.role === 'root') &&
    authRecord.isActive
      ? authRecord
      : null;
  const authChecked = !authLoading;

  const isAdmin = currentUser !== null;

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [sort, setSort] = useState<CommunitySort>(
    initialSort === 'hot' || initialSort === 'top' ? initialSort : 'latest',
  );

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
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(
    searchParams.get('category'),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 三栏布局数据
  const [categories, setCategories] = useState<CommunityCategory[]>([]);
  const [hotTopics, setHotTopics] = useState<CommunityPost[]>([]);
  const [activeMembers, setActiveMembers] = useState<MemberItem[]>([]);
  const [featuredTopics, setFeaturedTopics] = useState<CommunityPost[]>([]);

  /** 同步 URL */
  const syncUrl = useCallback(
    (tab: TabKey, p: number, tag: string | null, category: string | null, nextSort: CommunitySort) => {
      const params = new URLSearchParams();
      if (tab !== 'all') params.set('tab', tab);
      if (p > 1) params.set('page', String(p));
      if (tag) params.set('tag', tag);
      if (category) params.set('category', category);
      if (nextSort !== 'latest') params.set('sort', nextSort);
      const qs = params.toString();
      router.replace(`/community${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [router],
  );

  /** 加载聚合标签 */
  useEffect(() => {
    void (async () => {
      const tagsResult = await apiRequest<{ tags: string[] }>('/api/community/tags');
      if (tagsResult.ok) setTags((tagsResult.data?.tags ?? []).filter((tag) => typeof tag === 'string'));
    })();
  }, []);

  /** 加载侧边栏数据（版块 + 热榜 + 活跃用户 + 精选） */
  useEffect(() => {
    void (async () => {
      const hotParams = new URLSearchParams();
      hotParams.set('sort', 'hot');
      hotParams.set('pageSize', '8');
      const featParams = new URLSearchParams();
      featParams.set('pageSize', '8');
      featParams.set('sort', 'latest');

      const [catResult, hotResult, membersResult, featResult] = await Promise.all([
        apiRequest<{ categories: CommunityCategory[] }>('/api/community/categories'),
        apiRequest<{ topics: CommunityPost[] }>(`/api/community/topics?${hotParams.toString()}`),
        apiRequest<{ members: MemberItem[] }>('/api/community/members?sort=active&limit=6'),
        apiRequest<{ topics: CommunityPost[] }>(`/api/community/topics?${featParams.toString()}`),
      ]);
      if (catResult.ok) setCategories(catResult.data?.categories ?? []);
      if (hotResult.ok) setHotTopics((hotResult.data?.topics ?? []).slice(0, 6));
      if (membersResult.ok) setActiveMembers(membersResult.data?.members ?? []);
      if (featResult.ok) {
        const items = featResult.data?.topics ?? [];
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
      if (selectedTag) params.set('tag', selectedTag);
      if (selectedCategory) params.set('category', selectedCategory);
      params.set('sort', sort);
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
  }, [activeTab, selectedTag, selectedCategory, sort, page, isLoggedIn, authChecked]);

  useEffect(() => {
    void loadFeed();
    syncUrl(activeTab, page, selectedTag, selectedCategory, sort);
  }, [loadFeed, syncUrl, activeTab, page, selectedTag, selectedCategory, sort]);

  /** Tab 切换 */
  const handleTabChange = (key: string) => {
    setActiveTab(key as TabKey);
    setPage(1);
  };

  /** 点击标签 */
  const handleTagClick = (tag: string) => {
    setSelectedTag(tag === selectedTag ? null : tag);
    setPage(1);
  };

  const handleCategoryClick = (slug: string | null) => {
    setSelectedCategory(slug === selectedCategory ? null : slug);
    setPage(1);
  };

  const handleSortChange = (nextSort: CommunitySort) => {
    setSort(nextSort);
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

  // 标签筛选激活（搜索已聚合至顶栏，2026-08-20）
  const hasSearch = !!selectedTag;
  const isInitialLoading = loading && items.length === 0;

  return {
    t,
    router,
    currentUser,
    currentUserId,
    isLoggedIn,
    authChecked,
    isAdmin,
    activeTab,
    communityTabs,
    items,
    total,
    totalPages,
    page,
    setPage,
    selectedTag,
    selectedCategory,
    sort,
    tags,
    loading,
    error,
    categories,
    hotTopics,
    activeMembers,
    featuredTopics,
    pageNums,
    hasSearch,
    isInitialLoading,
    handleTabChange,
    handleTagClick,
    handleCategoryClick,
    handleSortChange,
    PAGE_SIZE,
  };
}

export type CommunityFeedState = ReturnType<typeof useCommunityFeed>;
