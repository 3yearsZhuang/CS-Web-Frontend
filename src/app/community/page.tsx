/**
 * @file 社区聚合首页 /community — 装配层
 *
 * 遵循 GENERAL 2.2「展示/容器分离」、2.4「组件 > 500 行拆分」：
 * 本文件仅负责 Hero、三栏布局、搜索条、标签筛选、Feed 列表与分页的编排；
 * 全部状态与逻辑下放到 `useCommunityFeed` Hook，卡片/侧栏复用既有 modules 子组件。
 */

'use client';

import Link from 'next/link';
import { Suspense } from 'react';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { FeedItemCard } from '@/modules/community/ui/feed-item-card';
import { CommunitySidebarNav } from '@/modules/community/ui/community-sidebar-nav';
import { CommunitySidebarTrending } from '@/modules/community/ui/community-sidebar-trending';
import { FeaturedTopicStrip } from '@/modules/community/ui/featured-topic-strip';
import { AdminCommunityPanel } from '@/modules/community/ui/community-admin-panel';
import { ProfileCommunityTab } from '@/modules/community/ui/community-profile-tab';
import { Button, Pagination, SectionLoading } from '@/components';
import { useCommunityFeed } from './use-community-feed';
import { VisibilityGate } from '@/shared/feature-visibility/visibility-gate';

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
  const c = useCommunityFeed();
  const {
    t,
    router,
    currentUser,
    currentUserId,
    isLoggedIn,
    authChecked,
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
    hasSearch,
    isInitialLoading,
    handleTabChange,
    handleSearchSubmit,
    handleClearSearch,
    handleTagClick,
    PAGE_SIZE,
  } = c;

  const hero: HeroState = {
    collapsed: c.heroCollapsed,
    capsuleVisible: c.capsuleVisible,
    onRevealComplete: c.onRevealComplete,
    onTitleClick: c.onTitleClick,
  };

  if (isInitialLoading) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center">
        <SectionLoading label="Loading..." />
      </main>
    );
  }

  return (
    <VisibilityGate componentKey="community">
      <main className="relative pt-16">
      {/* ============ [ 00 ] Hero ============ */}
      <CollapsingHero
        index="00"
        label="Community"
        hero={hero}
        pageKey="community"
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
            {t('heroTitle1')}
            <span className="text-[var(--primary)]">{t('heroTitle2')}</span>
            <span
              className={`transition-all hero-reveal ${
                hero.collapsed ? 'inline opacity-100 ml-1' : 'block max-h-[1.5em] opacity-100'
              } overflow-hidden`}
            >
              {t('heroTitle3')}
            </span>
            <span
              className={`display-serif italic text-[var(--muted-foreground)] transition-all hero-reveal ${
                hero.collapsed
                  ? 'text-[clamp(12px,1.6vw,18px)] ml-2 align-baseline'
                  : 'text-[clamp(14px,2vw,24px)] ml-3 align-baseline'
              }`}
            >
              {t('heroTitleEn')}
            </span>
          </h1>
        </RevealTitle>
        <RevealItem>
          <div
            className={`overflow-hidden transition-all hero-reveal ${
              hero.collapsed ? 'max-h-[14px] opacity-30 mt-1' : 'max-h-[200px] opacity-100 mt-8 sm:mt-12'
            }`}
          >
            <p
              className={`max-w-2xl text-[var(--muted-foreground)] leading-[1.8] line-clamp-1 transition-all hero-reveal ${
                hero.collapsed ? 'text-[9px]' : 'text-[15px] sm:text-[16px]'
              }`}
            >
              {t('heroDesc1')}
              <span className="serif-italic text-[var(--foreground)]">{t('heroDesc2')}</span>。
            </p>
          </div>
        </RevealItem>
      </CollapsingHero>

      {/* ============ Feed + 三栏布局 ============ */}
      <section className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto w-full">
          <div className="flex gap-0">
            {/* 左侧栏 — 版块导航（桌面端显示） */}
            <VisibilityGate componentKey="community-sidebar-nav">
              <div className="hidden md:block w-[200px] lg:w-[220px] flex-shrink-0 md:pr-6 md:border-r md:border-[var(--border)]">
                <CommunitySidebarNav categories={categories} />
              </div>
            </VisibilityGate>

            {/* 中间 — Feed 流 */}
            <div className="flex-1 md:px-6 lg:px-10 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10 sm:mb-16">
                <div>
                  <h2 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)] mb-4">
                    {hasSearch ? t('searchResults') : t('communityFeed')}
                    {hasSearch && searchQuery.trim() && (
                      <span className="text-[var(--primary)] ml-2">「{searchQuery.trim()}」</span>
                    )}
                    {selectedTag && <span className="text-[var(--primary)] ml-2">#{selectedTag}</span>}
                  </h2>
                  <p className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)] text-[13px]">
                    {hasSearch
                      ? loading
                        ? '// Searching...'
                        : error
                          ? `// ${error}`
                          : t('searchCount', { count: total })
                      : stats
                        ? t('statsLine', { topics: stats.topicCount, posts: stats.postCount, members: stats.memberCount })
                        : t('feedDefaultDesc')}
                  </p>
                </div>
              </div>

              {/* 搜索条 */}
              {activeTab !== 'mine' && (
              <>
              <VisibilityGate componentKey="community-search">
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
                      maxLength={80}
                      placeholder={t('searchPlaceholderFull')}
                      aria-label={t('searchPlaceholderFull')}
                      className="w-full px-4 py-4 bg-transparent border border-[var(--border)] text-[var(--foreground)] text-[16px] font-mono placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] focus-amber transition-colors pr-12"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={handleClearSearch}
                        aria-label={t('clearSearch')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors focus-amber w-6 h-6 flex items-center justify-center"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <Button
                    type="submit"
                    disabled={loading || searchQuery.trim().length < 2}
                    className="disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {loading ? t('searching') : t('search')}
                  </Button>
                  <Link href="/community/new" className="shrink-0">
                    <Button className="whitespace-nowrap">{t('publish')}</Button>
                  </Link>
                </div>
                {searchQuery.length > 0 && (
                  <div className="mt-2 meta-mono normal-case tracking-normal text-[var(--muted-foreground)] text-[11px]">
                    {searchQuery.length} / 80 {t('chars')}
                  </div>
                )}
              </form>
              </VisibilityGate>

              {/* 精选/置顶横滑区 */}
              {!hasSearch && activeTab === 'all' && featuredTopics.length > 0 && (
                <VisibilityGate componentKey="community-featured">
                  <FeaturedTopicStrip topics={featuredTopics} className="mb-8" />
                </VisibilityGate>
              )}

              {/* 标签筛选条 */}
              {tags.length > 0 && !selectedTag && (
                <VisibilityGate componentKey="community-tags">
                  <div className="mb-8">
                    <div className="meta-mono text-[11px] mb-3">
                      {t('hotTags')}
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
                </VisibilityGate>
              )}

              {selectedTag && (
                <div className="mb-8 flex items-center gap-3">
                  <span className="meta-mono text-[11px] text-[var(--muted-foreground)]">{t('selectedTag')}</span>
                  <Button
                    variant="primary-outline"
                    size="sm"
                    type="button"
                    onClick={() => handleTagClick(selectedTag)}
                  >
                    {selectedTag} ✕
                  </Button>
                </div>
              )}

              {/* Feed 列表 */}
              {(activeTab === 'member' || activeTab === 'following') && authChecked && !isLoggedIn ? (
                <div className="py-20 text-center border-t border-[var(--border)]">
                  <div className="meta-mono text-[var(--muted-foreground)] text-[14px] mb-3">{t('loginRequired')}</div>
                  <div className="display-serif text-[clamp(20px,3vw,28px)] text-[var(--foreground)] mb-2">
                    {activeTab === 'following' ? t('followingRequiresLogin') : t('memberRequiresLogin')}
                  </div>
                  <div className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)] text-[13px] mb-8">
                    {activeTab === 'following' ? t('followingLoginDesc') : t('memberLoginDesc')}
                  </div>
                  <Button onClick={() => router.push(`/login?redirect=/community?tab=${activeTab}`)}>{t('login')}</Button>
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
                    {t('retry')}
                  </button>
                </div>
              ) : items.length === 0 ? (
                <div className="py-16 text-center">
                  <div className="meta-mono text-[var(--muted-foreground)] mb-6">
                    {hasSearch ? t('noMatch') : t('noContent')}
                  </div>
                  {hasSearch && (
                    <button
                      onClick={handleClearSearch}
                      className="meta-mono text-[var(--primary)] underline-grow"
                    >
                      {t('clearFilter')}
                    </button>
                  )}
                </div>
              ) : (
                <VisibilityGate componentKey="community-feed">
                  <div className="border-t border-[var(--border)]">
                    {items.map((item, idx) => (
                      <FeedItemCard
                        key={`${item.kind}-${item.data.id}`}
                        item={item}
                        index={(page - 1) * PAGE_SIZE + idx + 1}
                      />
                    ))}
                  </div>
                </VisibilityGate>
              )}

              {/* 分页 */}
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

              </>
              )}

              {/* 「我的」标签页 — 我的主题 / 回复 / 收藏（入口由个人主页迁移至此） */}
              {activeTab === 'mine' && currentUserId && (
                <VisibilityGate componentKey="community-mine">
                  <ProfileCommunityTab userId={currentUserId} />
                </VisibilityGate>
              )}

              {/* Tab 99 — 社区管理（仅管理员） */}
              {activeTab === 'admin' && currentUser && (
                <VisibilityGate componentKey="community-admin">
                  <div>
                    <AdminCommunityPanel />
                  </div>
                </VisibilityGate>
              )}
            </div>

            {/* 右侧栏 — 热榜 + 活跃用户（桌面端显示） */}
            <VisibilityGate componentKey="community-sidebar-trending">
              <div className="hidden md:block w-[220px] lg:w-[260px] flex-shrink-0 md:pl-6 md:border-l md:border-[var(--border)]">
                <CommunitySidebarTrending
                  hotTopics={hotTopics}
                  activeMembers={activeMembers}
                  stats={
                    stats
                      ? { todayTopics: stats.topicCount, activeUsers: stats.memberCount, onlineUsers: 0 }
                      : null
                  }
                />
              </div>
            </VisibilityGate>
          </div>
        </div>
      </section>
    </main>
    </VisibilityGate>
  );
}
