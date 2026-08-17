/**
 * @file 用户公开主页（/users/[id]）— 技术档案 + 考试统计 + 社区活动
 */
'use client';

import { StaggerContainer, RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { type CapsuleTab } from '@/components/layout/floating-capsule-sidebar';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { Avatar } from '@/components/avatar';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { Button, SkeletonBlock } from '@/components';
import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion } from 'motion/react';
import Link from 'next/link';

type ProfileTab = 'profile' | 'exam' | 'community';

type TFn = (key: string, values?: Record<string, string | number | Date>) => string;

function techTagLabel(t: TFn, tag: string): string {
  const map: Record<string, string> = {
    web: t('techWeb'),
    ai: t('techAi'),
    system: t('techSystem'),
    game: t('techGame'),
    security: t('techSecurity'),
    mobile: t('techMobile'),
    data: t('techData'),
    devops: t('techDevops'),
    graphics: t('techGraphics'),
    hardware: t('techHardware'),
    algorithm: t('techAlgorithm'),
    design: t('techDesign'),
  };
  return map[tag] ?? tag;
}

interface PublicUser {
  id: string;
  email: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  avatarType: string;
  githubUrl: string | null;
  websiteUrl: string | null;
  techTags: string[];
  role: string;
  createdAt: string;
}

interface UserStats {
  topicCount: number;
  replyCount: number;
  examCount: number;
  examPassedCount: number;
}

interface CommunityPost {
  id: string;
  categoryId: string;
  title: string;
  status: string;
  viewCount: number;
  replyCount: number;
  likeCount: number;
  createdAt: string;
  category: { id: string; slug: string; name: string } | null;
}

export default function UserPublicPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations('userPublic');
  const { id } = use(params);
  const router = useRouter();
  const { collapsed, capsuleVisible, onRevealComplete, onTitleClick } = useCollapsingHero();

  const hero: HeroState = {
    collapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  };
  const [activeTab, setActiveTab] = useState<ProfileTab>('profile');

  const [user, setUser] = useState<PublicUser | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [topics, setTopics] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const tabs: CapsuleTab[] = useMemo(
    () => [
      { key: 'profile', num: '01', label: '资料 / Profile' },
      { key: 'exam', num: '02', label: '考试 / Exam' },
      { key: 'community', num: '03', label: '社区 / Community' },
    ],
    [],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [userRes, topicsRes] = await Promise.all([
          fetch(`/api/users/${id}`),
          fetch(`/api/community/users/${id}/topics?page=1&page_size=5`),
        ]);
        if (!userRes.ok) {
          const data = await userRes.json();
          throw new Error(data.error || t('notFound'));
        }
        const userData = await userRes.json();
        if (cancelled) return;
        setUser(userData.user);
        setStats(userData.stats);

        if (topicsRes.ok) {
          const topicsData = await topicsRes.json();
          if (!cancelled) setTopics(topicsData.items || []);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : t('loadFailed'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <main className="relative pt-16 pixel-page">
        <div className="max-w-[1600px] mx-auto px-6 py-24">
          <SkeletonBlock rows={2} />
        </div>
      </main>
    );
  }

  if (error || !user) {
    return (
      <main className="relative pt-16 pixel-page">
        <div className="max-w-[1600px] mx-auto px-6 py-24 text-center">
          <div className="meta-mono text-[var(--muted-foreground)] mb-4">[ 404 ]</div>
          <h1 className="display-serif text-4xl mb-4">{error || t('notFound')}</h1>
          <Button variant="pixel-outline" onClick={() => router.push('/')}>
            {t('backHome')}
          </Button>
        </div>
      </main>
    );
  }

  const displayName = user.displayName || user.email.split('@')[0];

  return (
    <main className="relative pt-16 pixel-page">
      {/* [00] Hero — 用户身份 */}
      <CollapsingHero
        index="00"
        label="Profile"
        hero={hero}
        pageKey="profile"
        minHeight="50vh"
        capsule={{
          tabs,
          activeKey: activeTab,
          onTabChange: (key) => setActiveTab(key as ProfileTab),
        }}
        sidebarBottom={<span aria-hidden="true" />}
      >
        <RevealItem>
          <div className="flex items-center gap-4 mb-4">
            <Avatar
              email={user.email}
              displayName={user.displayName}
              avatarUrl={user.avatarUrl}
              avatarType={user.avatarType}
              size={hero.collapsed ? 32 : 64}
            />
            <div>
              <h1
                className={`display-serif transition-all duration-700 ease-[var(--ease-ark)] ${
                  hero.collapsed
                    ? 'text-xl cursor-pointer hover:text-[var(--primary)]'
                    : 'text-4xl md:text-5xl'
                }`}
                onClick={hero.collapsed ? hero.onTitleClick : undefined}
              >
                {displayName}
              </h1>
              <p className="meta-mono text-[var(--muted-foreground)] mt-1">
                <span className={user.role === 'root' ? 'text-[var(--destructive)]' : user.role === 'admin' ? 'text-[var(--primary)]' : undefined}>
                  {user.role === 'root' ? t('roleRoot') : user.role === 'admin' ? t('roleAdmin') : t('roleMember')}
                </span>
                {' · '}{t('joined', { date: new Date(user.createdAt).toLocaleDateString('zh-CN') })}
              </p>
            </div>
          </div>
          {user.bio && (
            <p className={`text-sm text-[var(--muted-foreground)] max-w-2xl transition-all duration-700 ${
              hero.collapsed ? 'opacity-0 h-0 mt-0 overflow-hidden' : 'opacity-100 mt-3'
            }`}>
              {user.bio}
            </p>
          )}
        </RevealItem>
      </CollapsingHero>

      {/* Tab 内容区 */}
      <section className="border-t border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto md:pl-[72px] lg:pl-[88px]">
          <div className="px-6 py-12">
            {/* [01] 资料 */}
            {activeTab === 'profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2 className="display-serif text-3xl mb-8">{t('profileTitle')}</h2>

                {/* 技术标签 */}
                <div className="mb-8">
                  <div className="meta-mono text-[var(--muted-foreground)] mb-3">
                    [ 01 ] {t('techDir')}
                  </div>
                  {user.techTags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {user.techTags.map((tag) => (
                        <span
                          key={tag}
                          className="meta-mono text-[13px] px-3 py-1.5 border border-[var(--border)] text-[var(--foreground)]"
                        >
                          {techTagLabel(t, tag)}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--muted-foreground)]/60">{t('noTags')}</p>
                  )}
                </div>

                {/* 链接 */}
                <div className="mb-8">
                  <div className="meta-mono text-[var(--muted-foreground)] mb-3">
                    [ 02 ] {t('links')}
                  </div>
                  <div className="space-y-2">
                    {user.githubUrl ? (
                      <a
                        href={user.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-[var(--primary)] hover:underline"
                      >
                        <span className="meta-mono text-[var(--muted-foreground)]">{t('github')}</span>
                        {user.githubUrl}
                      </a>
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)]/60">{t('noGithub')}</p>
                    )}
                    {user.websiteUrl ? (
                      <a
                        href={user.websiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-[var(--primary)] hover:underline"
                      >
                        <span className="meta-mono text-[var(--muted-foreground)]">{t('website')}</span>
                        {user.websiteUrl}
                      </a>
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)]/60">{t('noWebsite')}</p>
                    )}
                  </div>
                </div>

                {/* 社区统计 */}
                {stats && (
                  <div>
                    <div className="meta-mono text-[var(--muted-foreground)] mb-3">
                      [ 03 ] {t('communityActivity')}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="card-minimal p-4 text-center">
                        <div className="display-serif text-2xl">{stats.topicCount}</div>
                        <div className="meta-mono text-[11px] text-[var(--muted-foreground)] mt-1">{t('statTopic')}</div>
                      </div>
                      <div className="card-minimal p-4 text-center">
                        <div className="display-serif text-2xl">{stats.replyCount}</div>
                        <div className="meta-mono text-[11px] text-[var(--muted-foreground)] mt-1">{t('statReply')}</div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* [02] 考试 */}
            {activeTab === 'exam' && stats && (
              <motion.div
                key="exam"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2 className="display-serif text-3xl mb-8">{t('examTitle')}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                  <div className="card-minimal p-4 text-center">
                    <div className="display-serif text-2xl">{stats.examCount}</div>
                    <div className="meta-mono text-[11px] text-[var(--muted-foreground)] mt-1">{t('examTaken')}</div>
                  </div>
                  <div className="card-minimal p-4 text-center">
                    <div className="display-serif text-2xl">{stats.examPassedCount}</div>
                    <div className="meta-mono text-[11px] text-[var(--muted-foreground)] mt-1">{t('examPassed')}</div>
                  </div>
                  <div className="card-minimal p-4 text-center">
                    <div className="display-serif text-2xl">
                      {stats.examCount > 0 ? Math.round((stats.examPassedCount / stats.examCount) * 100) : 0}%
                    </div>
                    <div className="meta-mono text-[11px] text-[var(--muted-foreground)] mt-1">{t('examRate')}</div>
                  </div>
                </div>
                {stats.examCount === 0 && (
                  <p className="text-sm text-[var(--muted-foreground)]/60">{t('noExams')}</p>
                )}
              </motion.div>
            )}

            {/* [03] 社区 */}
            {activeTab === 'community' && (
              <motion.div
                key="community"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <h2 className="display-serif text-3xl mb-8">{t('recentTopics')}</h2>
                {topics.length > 0 ? (
                  <div className="space-y-2">
                    {topics.map((topic) => (
                      <Link
                        key={topic.id}
                        href={`/community/community/${topic.category?.slug || 'general'}/${topic.id}`}
                        className="card-minimal block p-4 group"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <h3 className="text-sm font-medium group-hover:text-[var(--primary)] transition-colors line-clamp-1">
                              {topic.title}
                            </h3>
                            <div className="meta-mono text-[11px] text-[var(--muted-foreground)]/60 mt-1">
                              {topic.category?.name || t('defaultCat')} · {new Date(topic.createdAt).toLocaleDateString('zh-CN')}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="meta-mono text-[11px] text-[var(--muted-foreground)]">
                              {topic.replyCount} {t('replies')}
                            </span>
                            <span className="meta-mono text-[11px] text-[var(--muted-foreground)]">
                              {topic.likeCount} {t('likes')}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[var(--muted-foreground)]/60">{t('noTopics')}</p>
                )}
                {stats && (
                  <div className="mt-8">
                    <div className="meta-mono text-[var(--muted-foreground)] mb-3">
                      社区活跃度
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="card-minimal p-4 text-center">
                        <div className="display-serif text-2xl">{stats.topicCount}</div>
                        <div className="meta-mono text-[11px] text-[var(--muted-foreground)] mt-1">{t('statTopic')}</div>
                      </div>
                      <div className="card-minimal p-4 text-center">
                        <div className="display-serif text-2xl">{stats.replyCount}</div>
                        <div className="meta-mono text-[11px] text-[var(--muted-foreground)] mt-1">{t('statReply')}</div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}