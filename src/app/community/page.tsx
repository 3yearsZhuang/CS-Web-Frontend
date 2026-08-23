/**
 * @file Community home — application-style shell with focused feed browsing
 */
'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { Compass, Filter, Flame, PenLine, Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Avatar, Badge, Button, Pagination, SectionLoading } from '@/components';
import { VisibilityGate } from '@/shared/feature-visibility/visibility-gate';
import { FeedItemCard } from '@/modules/community/ui/feed-item-card';
import { CommunitySpotlight } from '@/modules/community/ui/community-spotlight';
import { AdminCommunityPanel } from '@/modules/community/ui/community-admin-panel';
import { ProfileCommunityTab } from '@/modules/community/ui/community-profile-tab';
import { useCommunityFeed, type CommunitySort } from './use-community-feed';

export default function CommunityPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen pt-16 flex items-center justify-center pixel-page">
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
  const selectedCategory = c.categories.find((category) => category.slug === c.selectedCategory);
  const spotlight = c.featuredTopics[0];

  if (c.isInitialLoading) {
    return (
      <main className="min-h-screen pt-16 flex items-center justify-center pixel-page">
        <SectionLoading label="Loading..." />
      </main>
    );
  }

  return (
    <VisibilityGate componentKey="community">
      <main className="min-h-screen bg-[var(--background)] pt-16 pixel-page">
        <CommunityHeader community={c} />

        <section className="border-b border-[var(--border)] bg-[var(--background)]">
          <div className="mx-auto max-w-[1320px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <FeedHeading community={c} />

            {c.activeTab === 'mine' && c.currentUserId ? (
              <VisibilityGate componentKey="community-mine">
                <ProfileCommunityTab userId={c.currentUserId} />
              </VisibilityGate>
            ) : c.activeTab === 'admin' && c.currentUser ? (
              <VisibilityGate componentKey="community-admin">
                <AdminCommunityPanel />
              </VisibilityGate>
            ) : (
              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-12 min-w-0 lg:col-span-8 xl:col-span-9">
                  {spotlight && !c.selectedTag && !c.selectedCategory && c.activeTab === 'all' && (
                    <div className="mb-8">
                      <CommunitySpotlight post={spotlight} />
                    </div>
                  )}

                  <FeedToolbar community={c} selectedCategoryName={selectedCategory?.name} />
                  <FeedBody community={c} />
                  <Pagination page={c.page} totalPages={c.totalPages} onPageChange={c.setPage} />
                </div>

                <CommunityAside community={c} />
              </div>
            )}
          </div>
        </section>
      </main>
    </VisibilityGate>
  );
}

type CommunityState = ReturnType<typeof useCommunityFeed>;

function CommunityHeader({ community: c }: { community: CommunityState }) {
  const t = useTranslations('community');
  return (
    <header className="border-b border-[var(--border)] bg-[var(--card)]">
      <div className="mx-auto max-w-[1320px] px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="section-marker">[ 00 ] — Community</span>
              <Badge variant="success">ONLINE</Badge>
            </div>
            <h1 className="mb-3 display-serif text-[clamp(32px,5vw,62px)] leading-[1.03] text-[var(--foreground)]">
              {t('heroTitle1')}<span className="text-[var(--primary)]">{t('heroTitle2')}</span>
            </h1>
            <p className="max-w-xl text-sm leading-7 text-[var(--muted-foreground)]">{t('communityIntro')}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Button variant="outline" onClick={() => c.router.push('/community/new')}>
              <PenLine className="h-4 w-4" /> {t('newPost')}
            </Button>
            {!c.isLoggedIn && (
              <Button variant="primary" onClick={() => c.router.push('/login?redirect=/community')}>
                {t('login')}
              </Button>
            )}
          </div>
        </div>

        <nav className="mt-8 flex gap-1 overflow-x-auto border-t border-[var(--border)] pt-3" aria-label={t('browseLabel')}>
          {c.communityTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => c.handleTabChange(tab.key)}
              className={`min-h-10 shrink-0 border-b-2 px-3 text-left text-sm transition-colors ${
                c.activeTab === tab.key
                  ? 'border-[var(--primary)] text-[var(--foreground)]'
                  : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

function FeedHeading({ community: c }: { community: CommunityState }) {
  const t = useTranslations('community');
  const title = c.activeTab === 'mine'
    ? t('tabMine')
    : c.activeTab === 'member'
      ? t('channelMembers')
      : c.activeTab === 'following'
        ? t('channelFollowing')
        : c.activeTab === 'admin'
          ? t('tabAdmin')
          : t('communityFeed');

  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <div className="section-marker mb-2">[ 01 ] — {t('browseLabel')}</div>
        <h2 className="display-serif text-[clamp(28px,4vw,48px)] text-[var(--foreground)]">{title}</h2>
      </div>
      <span className="meta-mono hidden sm:block">{t('feedCount', { count: c.total })}</span>
    </div>
  );
}

function FeedToolbar({ community: c, selectedCategoryName }: { community: CommunityState; selectedCategoryName?: string }) {
  const t = useTranslations('community');
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="meta-mono text-[var(--muted-foreground)]">{t('categoryLabel')}:</span>
        {selectedCategoryName && c.selectedCategory && (
          <button type="button" onClick={() => c.handleCategoryClick(c.selectedCategory)} className="badge badge-primary inline-flex items-center gap-1">
            {selectedCategoryName} ×
          </button>
        )}
        {c.selectedTag && (
          <button type="button" onClick={() => c.handleTagClick(c.selectedTag!)} className="badge badge-primary inline-flex items-center gap-1">
            #{c.selectedTag} ×
          </button>
        )}
        {!selectedCategoryName && !c.selectedTag && <span className="text-sm text-[var(--muted-foreground)]">{t('channelAll')}</span>}
      </div>
      {c.activeTab !== 'member' && <SortTabs sort={c.sort} onChange={c.handleSortChange} />}
    </div>
  );
}

function SortTabs({ sort, onChange }: { sort: CommunitySort; onChange: (sort: CommunitySort) => void }) {
  const t = useTranslations('community');
  const options: Array<[CommunitySort, string]> = [
    ['latest', t('sortLatest')],
    ['hot', t('sortHot')],
    ['top', t('sortTop')],
  ];
  return (
    <div className="flex items-center gap-1 rounded border border-[var(--border)] p-1">
      {options.map(([value, label]) => (
        <button key={value} type="button" onClick={() => onChange(value)} className={`px-2.5 py-1.5 text-xs ${sort === value ? 'bg-[var(--accent)] text-[var(--foreground)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

function FeedBody({ community: c }: { community: CommunityState }) {
  const t = useTranslations('community');
  if ((c.activeTab === 'member' || c.activeTab === 'following') && c.authChecked && !c.isLoggedIn) {
    return <LoginPrompt tab={c.activeTab} router={c.router} />;
  }
  if (c.loading) return <SectionLoading label={c.selectedTag ? 'Searching...' : 'Loading...'} />;
  if (c.error) {
    return (
      <div className="border border-[var(--border)] p-10 text-center">
        <p className="mb-4 text-sm text-[var(--destructive)]">{c.error}</p>
        <button type="button" onClick={() => window.location.reload()} className="meta-mono text-[var(--primary)] underline-grow">{t('retry')}</button>
      </div>
    );
  }
  if (c.items.length === 0) {
    return (
      <div className="border border-dashed border-[var(--border)] p-12 text-center">
        <Compass className="mx-auto mb-4 h-7 w-7 text-[var(--muted-foreground)]" />
        <p className="mb-4 text-sm text-[var(--muted-foreground)]">{c.hasSearch ? t('noMatch') : t('noContent')}</p>
        {(c.selectedTag || c.selectedCategory) && (
          <button
            type="button"
            onClick={() => {
              if (c.selectedTag) c.handleTagClick(c.selectedTag);
              if (c.selectedCategory) c.handleCategoryClick(c.selectedCategory);
            }}
            className="meta-mono text-[var(--primary)] underline-grow"
          >
            {t('clearFilter')}
          </button>
        )}
      </div>
    );
  }
  return (
    <VisibilityGate componentKey="community-feed">
      <div className="border-t border-[var(--border)]">
        {c.items.map((item) => <FeedItemCard key={`${item.kind}-${item.data.id}`} item={item} />)}
      </div>
    </VisibilityGate>
  );
}

function CommunityAside({ community: c }: { community: CommunityState }) {
  const t = useTranslations('community');
  const common = useTranslations('communityCommon');
  return (
    <aside className="col-span-12 space-y-6 lg:col-span-4 xl:col-span-3">
      <section className="border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="mb-4 flex items-center gap-2"><Filter className="h-4 w-4 text-[var(--primary)]" /><h3 className="text-sm font-semibold">{t('sidebarCategories')}</h3></div>
        <div className="space-y-1">
          <CategoryButton active={!c.selectedCategory} onClick={() => c.handleCategoryClick(null)} label={t('channelAll')} />
          {c.categories.map((category) => (
            <CategoryButton key={category.id} active={c.selectedCategory === category.slug} onClick={() => c.handleCategoryClick(category.slug)} label={category.name} count={category.postCount ?? category.topicCount} />
          ))}
        </div>
        {c.tags.length > 0 && (
          <div className="mt-5 border-t border-[var(--border)] pt-4">
            <div className="meta-mono mb-3">{t('tagLabel')}</div>
            <div className="flex flex-wrap gap-1.5">
              {c.tags.slice(0, 10).map((tag) => (
                <button key={tag} type="button" onClick={() => c.handleTagClick(tag)} className={`badge normal-case tracking-normal ${c.selectedTag === tag ? 'badge-primary' : 'badge-muted'}`}>#{tag}</button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="mb-4 flex items-center gap-2"><Flame className="h-4 w-4 text-[var(--primary)]" /><h3 className="text-sm font-semibold">{t('sidebarTrending')}</h3></div>
        <div className="space-y-4">
          {c.hotTopics.slice(0, 5).map((topic, index) => (
            <Link key={topic.id} href={`/community/${topic.id}`} className="group flex gap-3 focus-ring">
              <span className="meta-mono text-[var(--muted-foreground)]">0{index + 1}</span>
              <span className="line-clamp-2 text-sm leading-5 text-[var(--foreground)] group-hover:text-[var(--primary)]">{topic.title}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="border border-[var(--border)] bg-[var(--card)] p-5">
        <div className="mb-4 flex items-center gap-2"><Users className="h-4 w-4 text-[var(--primary)]" /><h3 className="text-sm font-semibold">{t('sidebarMembers')}</h3></div>
        <div className="space-y-3">
          {c.activeMembers.slice(0, 5).map((member) => (
            <Link key={member.id} href={`/users/${member.id}`} className="flex items-center gap-3 focus-ring">
              <Avatar email={member.id} displayName={member.displayName} avatarUrl={member.avatarUrl} avatarType={member.avatarType} size={30} />
              <span className="truncate text-sm text-[var(--foreground)]">{member.displayName ?? common('trendingUnnamedUser')}</span>
            </Link>
          ))}
        </div>
      </section>
    </aside>
  );
}

function CategoryButton({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button type="button" onClick={onClick} className={`flex min-h-10 w-full items-center justify-between px-2 text-left text-sm transition-colors ${active ? 'bg-[var(--accent)] text-[var(--primary)]' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}>
      <span>{label}</span>{count !== undefined && <span className="meta-mono">{count}</span>}
    </button>
  );
}

function LoginPrompt({ tab, router }: { tab: string; router: CommunityState['router'] }) {
  const t = useTranslations('community');
  return (
    <div className="border border-dashed border-[var(--border)] p-12 text-center">
      <p className="mb-4 text-sm text-[var(--muted-foreground)]">{tab === 'following' ? t('followingRequiresLogin') : t('memberRequiresLogin')}</p>
      <Button onClick={() => router.push(`/login?redirect=/community?tab=${tab}`)}>{t('login')}</Button>
    </div>
  );
}
