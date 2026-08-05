/**
 * @file 个人主页 — 资料 / 安全 / 活动 / 论坛 / 入社，左侧 tab 导航 + 右侧内容区
 *
 * 装配层（GENERAL 2.2 展示/容器分离、2.4「组件 > 500 行拆分」）：
 * 仅负责 tab 状态、Hero、侧边栏与子组件编排；数据获取与业务逻辑下放到
 * `useProfile` / `usePassword` Hook 与各 tab 子组件。
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { StaggerContainer, RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { FloatingCapsuleSidebar, type CapsuleTab } from '@/components/layout/floating-capsule-sidebar';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { Avatar } from '@/components/avatar';
import { ProfileForumTab } from '@/modules/community/ui/forum-profile-tab';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { Button, SectionLoading } from '@/components';
import { formatDate } from '@/shared/utils/utils';
import { useProfile } from '@/modules/user/ui/hooks/use-profile';
import { ProfileTab } from './profile-tab';
import { SecurityTab } from './security-tab';
import { ActivityTab } from './activity-tab';
import { JoinTab } from './join-tab';

type ProfileTabKey = 'profile' | 'security' | 'activity' | 'forum' | 'join';

/** 子组件装配（读取 URL ?tab= 参数、GitHub 绑定提示、Hero、侧边栏） */
function ProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations('profile');

  // Tab 切换（资料 / 安全 / 活动 / 论坛 / 入社）
  const [activeTab, setActiveTab] = useState<ProfileTabKey>('profile');

  // 悬浮胶囊侧边栏 Tab 配置
  const profileTabs: CapsuleTab[] = [
    { key: 'profile', num: '01', label: t('tabProfile') },
    { key: 'security', num: '02', label: t('tabSecurity') },
    { key: 'activity', num: '03', label: t('tabActivity') },
    { key: 'forum', num: '04', label: t('tabForum') },
    { key: 'join', num: '05', label: t('tabJoin') },
  ];

  // Hero 进入 1s 后自动收缩并悬浮于页首（动画期间锁定滚动）
  const { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick } = useCollapsingHero();

  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  };

  // GitHub 自动绑定提示
  const [githubBound, setGithubBound] = useState(false);

  // 共享：资料 / 活动数据（由 useProfile 持有，注入子组件，避免重复请求）
  const profile = useProfile();
  const { user, activities, loading, loadError } = profile;

  // 初始 URL 参数处理：?tab= / ?github_bound=（仅挂载时执行一次）
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['profile', 'security', 'activity', 'forum', 'join'].includes(tabParam)) {
      setActiveTab(tabParam as ProfileTabKey);
    }
    if (searchParams.get('github_bound') === '1') {
      setGithubBound(true);
      router.replace('/profile');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅挂载时执行一次
  }, []);

  // 加载中状态
  if (loading) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center">
        <SectionLoading label="Loading..." />
      </main>
    );
  }

  // 加载错误状态
  if (loadError || !user) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="meta-mono text-[var(--destructive)] mb-4">{t('errorTitle')}</div>
          <p className="text-[14px] text-[var(--muted-foreground)] mb-8">
            {loadError || t('loadFailed')}
          </p>
          <Link
            href="/"
            className="meta-mono text-[var(--primary)] underline-grow"
          >
            {t('backHome')}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative pt-16">
      {/* ============ [00] Hero — 身份信息（1s 后自动收缩悬浮） ============ */}
      <CollapsingHero
        index="00"
        label={t('identityLabel')}
        hero={hero}
        pageKey="profile"
        minHeight="60vh"
        sidebarBottom={<span aria-hidden="true" />}
      >
        <div className={`flex flex-col sm:flex-row sm:items-center ${hero.collapsed ? 'gap-3 sm:gap-4' : 'gap-6 sm:gap-10'}`}>
          <RevealItem duration={0.9}>
            <div
              className={`transition-all hero-reveal ${
                hero.collapsed ? 'scale-[0.5] origin-left' : 'scale-100'
              }`}
            >
              <Avatar
                email={user.email}
                displayName={user.displayName}
                avatarUrl={user.avatarUrl}
                avatarType={user.avatarType}
                size={128}
              />
            </div>
          </RevealItem>
          <div className="flex-1 min-w-0">
            <RevealTitle>
              <h1
                className={`display-serif text-[var(--foreground)] break-words transition-all hero-reveal ${
                  hero.collapsed
                    ? 'cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2]'
                    : 'text-[clamp(32px,6vw,72px)] leading-[1.05] sm:leading-[0.95]'
                }`}
                onClick={hero.collapsed ? hero.onTitleClick : undefined}
              >
                {user.displayName || (
                  <>
                    {t('unnamed')}
                    <span className="text-[var(--muted-foreground)]"> {t('unnamedUser')}</span>
                  </>
                )}
                <span
                  className={`display-serif italic text-[var(--muted-foreground)] transition-all hero-reveal ${
                    hero.collapsed
                      ? 'text-[clamp(12px,1.6vw,18px)] ml-2 align-baseline'
                      : 'text-[clamp(14px,2vw,24px)] ml-3 align-baseline'
                  }`}
                >
                  {t('identityEn')}
                </span>
              </h1>
            </RevealTitle>
            <div
              className={`overflow-hidden transition-all hero-reveal ${
                hero.collapsed ? 'max-h-0 opacity-0 mt-0' : 'max-h-[100px] opacity-100 mt-3'
              }`}
            >
              <RevealItem>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 meta-mono text-[12px] text-[var(--muted-foreground)]">
                  <span className="break-all">{user.email}</span>
                  <span className="hidden sm:inline">/</span>
                  <span>{t('joined', { date: formatDate(user.createdAt) })}</span>
                </div>
              </RevealItem>
            </div>
            {user.bio && (
              <div
                className={`overflow-hidden transition-all hero-reveal ${
                  hero.collapsed ? 'max-h-0 opacity-0 mt-0' : 'max-h-[200px] opacity-100 mt-6'
                }`}
              >
                <RevealItem>
                  <p className="max-w-2xl text-[14px] sm:text-[15px] text-[var(--muted-foreground)] leading-[1.85]">
                    {user.bio}
                  </p>
                </RevealItem>
              </div>
            )}
          </div>
        </div>
      </CollapsingHero>

      {/* ============ Tab 区域 ============ */}
      <section data-section-nav="01|资料" className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto w-full md:pl-[72px] lg:pl-[88px]">
          <StaggerContainer>
            {/* 标题 + 悬浮胶囊侧边栏 */}
            <div className="grid grid-cols-12 gap-0 items-end mb-10 sm:mb-16">
              <div className="col-span-12">
                <RevealTitle>
                  <h1 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)] leading-[1.05] sm:leading-[0.95]">
                    {activeTab === 'profile'
                      ? t('profileTitle')
                      : activeTab === 'security'
                        ? t('securityTitle')
                        : activeTab === 'activity'
                          ? t('activityTitle')
                          : activeTab === 'forum'
                            ? t('forumTitle')
                            : t('joinTitle')}
                    <span className="text-[var(--muted-foreground)]">
                      {' '}
                      /{' '}
                      {activeTab === 'profile'
                        ? t('profileEn')
                        : activeTab === 'security'
                          ? t('securityEn')
                          : activeTab === 'activity'
                            ? t('activityEn')
                            : activeTab === 'forum'
                              ? t('forumEn')
                              : t('joinEn')}
                    </span>
                  </h1>
                </RevealTitle>
                <RevealItem>
                  <div className="mt-4 meta-mono text-[12px] text-[var(--muted-foreground)]">
                    <span className="ark-divider">{t('userPanel')}</span>
                  </div>
                </RevealItem>
              </div>
            </div>
          </StaggerContainer>

          {/* 悬浮胶囊侧边栏（桌面端） + 移动端 Tab 条 */}
          <FloatingCapsuleSidebar
            visible={capsuleVisible}
            tabs={profileTabs}
            activeKey={activeTab}
            onTabChange={(key) => setActiveTab(key as ProfileTabKey)}
          />

          {/* GitHub 自动绑定提示 */}
          {githubBound && (
            <div className="mb-6 p-4 border-l-2 border-[var(--primary)] bg-[var(--primary)]/[0.06] flex items-start gap-3">
              <span className="meta-mono text-[var(--primary)] text-[12px] shrink-0">[ BOUND ]</span>
              <div className="flex-1">
                <p className="text-[13px] text-[var(--foreground)] leading-relaxed">
                  {t('githubBoundTitle')}
                </p>
                <p className="text-[11px] font-mono text-[var(--muted-foreground)] mt-1">
                  {t('githubBoundDesc')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setGithubBound(false)}
                className="meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] shrink-0"
              >
                ✕
              </button>
            </div>
          )}

          {/* ============ Tab 01 — 资料与头像 ============ */}
          {activeTab === 'profile' && <ProfileTab {...profile} />}

          {/* ============ Tab 02 — 账号安全 ============ */}
          {activeTab === 'security' && <SecurityTab />}

          {/* ============ Tab 03 — 活动记录 ============ */}
          {activeTab === 'activity' && <ActivityTab activities={activities} />}

          {/* ============ Tab 04 — 论坛活动（我的主题 / 回复 / 收藏） ============ */}
          {activeTab === 'forum' && <ProfileForumTab userId={user.id} />}

          {/* ============ Tab 05 — 入社申请（我的申请列表） ============ */}
          {activeTab === 'join' && <JoinTab />}
        </div>
      </section>
    </main>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <ProfileContent />
    </Suspense>
  );
}
