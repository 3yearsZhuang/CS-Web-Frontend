/**
 * @file 管理员控制台（/admin）— 容器只负责身份校验、Tab 路由、Hero/侧栏布局
 * 领域逻辑下沉到 @/modules/admin/ui/* 子面板；logs Tab 仅 root 可见
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { type CapsuleTab } from '@/components/layout/floating-capsule-sidebar';
import { ToastProvider } from '@/components/feedback/toast';
import { ArkDivider } from '@/components';
import { AdminUsersPanel } from '@/modules/admin/ui/admin-users-panel';
import { AdminMessagesPanel } from '@/modules/admin/ui/admin-messages-panel';
import { AdminLogsPanel } from '@/modules/admin/ui/admin-logs-panel';
import { AdminRolesPanel } from '@/modules/admin/ui/admin-roles-panel';
import { AdminJoinPanel } from '@/modules/admin/ui/admin-join-panel';
import { AdminFeatureVisibilityPanel } from '@/modules/admin/ui/admin-feature-visibility-panel';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { SectionNav } from '@/components/primitives/section-nav';
import { type AdminTab, type SafeUser } from '@/modules/admin/ui/types';
import { VisibilityGate } from '@/shared/feature-visibility/visibility-gate';

/* ============= 工具函数 ============= */

/** 根据 activeTab 返回 Hero 大标题翻译 key（组件内解析） */
function tabTitleKey(tab: AdminTab): string {
  switch (tab) {
    case 'roles':
      return 'tabTitleRoles';
    case 'users':
      return 'tabTitleUsers';
    case 'messages':
      return 'tabTitleMessages';
    case 'join':
      return 'tabTitleJoin';
    case 'logs':
      return 'tabTitleLogs';
    case 'feature-visibility':
      return 'tabTitleFeatureVisibility';
  }
}

/* ============= 页面组件 ============= */

export default function AdminPage() {
  const router = useRouter();
  const t = useTranslations('admin');

  // 当前登录用户（管理员校验 + 自身 id）
  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  // Tab 切换
  const [activeTab, setActiveTab] = useState<AdminTab>('users');

  // Hero 折叠状态（滚动时收缩为顶部悬浮条）
  const { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick } = useCollapsingHero();
  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  };

  /** 子面板遇到 403 时上报 → 容器进入无权限态 */
  const handleForbidden = useCallback(() => setForbidden(true), []);

  /** 初次加载：校验管理员身份 */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { cache: 'no-store' });
        if (res.status === 401) {
          if (!cancelled) router.replace('/login');
          return;
        }
        if (!res.ok) {
          if (!cancelled) {
            setAuthLoading(false);
            setForbidden(true);
          }
          return;
        }
        const data = (await res.json()) as { user: SafeUser };
        if (cancelled) return;
        if ((data.user.role !== 'admin' && data.user.role !== 'root') || !data.user.isActive) {
          setForbidden(true);
          setAuthLoading(false);
          return;
        }
        setCurrentUser(data.user);
        setAuthLoading(false);
      } catch {
        if (!cancelled) {
          setAuthLoading(false);
          setForbidden(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  /** 当前登录用户是否为 root（决定 logs Tab 可见性） */
  const isRootAdmin = currentUser?.role === 'root';

  // 悬浮胶囊侧边栏 Tab 配置（roles / logs 仅 root 可见）
  const adminTabs: CapsuleTab[] = [
    ...(isRootAdmin ? [{ key: 'roles', num: '00', label: t('tabRoles') }] : []),
    { key: 'users', num: '01', label: t('tabUsers') },
    { key: 'messages', num: '02', label: t('tabMessages') },
    { key: 'join', num: '03', label: t('tabJoin') },
    ...(isRootAdmin ? [{ key: 'logs', num: '04', label: t('tabLogs') }] : []),
    ...(isRootAdmin ? [{ key: 'feature-visibility', num: '05', label: t('tabFeatureVisibility') }] : []),
  ];

  /* ============= 渲染：加载中 ============= */
  if (authLoading) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 border border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
          <span className="meta-mono text-[var(--muted-foreground)]">{t('verifying')}</span>
        </div>
      </main>
    );
  }

  /* ============= 渲染：无权限 ============= */
  if (forbidden || !currentUser) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="meta-mono text-[var(--destructive)] mb-4">{t('accessDenied')}</div>
          <p className="text-[14px] text-[var(--muted-foreground)] mb-8">
            {t('noAccess')}
          </p>
          <Link href="/" className="meta-mono text-[var(--primary)] underline-grow">
            {t('backHome')}
          </Link>
        </div>
      </main>
    );
  }

  /* ============= 渲染：主页面 ============= */
  return (
    <ToastProvider>
      <VisibilityGate componentKey="admin">
      <main className="relative pt-16">
        <CollapsingHero
          index="00"
          label="Admin"
          hero={hero}
          minHeight="60vh"
          capsule={{
            tabs: adminTabs,
            activeKey: activeTab,
            onTabChange: (key) => setActiveTab(key as AdminTab),
          }}
        >
          <RevealTitle>
            <h1
              className={`display-serif text-[var(--foreground)] transition-all hero-reveal ${
                hero.collapsed
                  ? 'cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2]'
                  : 'text-[clamp(32px,6vw,72px)] leading-[1.05] sm:leading-[0.95]'
              }`}
              onClick={hero.collapsed ? hero.onTitleClick : undefined}
            >
              {t(tabTitleKey(activeTab) as Parameters<typeof t>[0])}
              <span
                className={`display-serif italic text-[var(--muted-foreground)] transition-all hero-reveal ${
                  hero.collapsed
                    ? 'text-[clamp(12px,1.6vw,18px)] ml-2 align-baseline'
                    : 'text-[clamp(14px,2vw,24px)] ml-3 align-baseline'
                }`}
              >
                {t('adminEn')}
              </span>
            </h1>
          </RevealTitle>
          <div
            className={`overflow-hidden transition-all hero-reveal ${
              hero.collapsed ? 'max-h-0 opacity-0' : 'max-h-[200px] opacity-100'
            }`}
          >
            <RevealItem>
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 meta-mono text-[12px] text-[var(--muted-foreground)]">
                <ArkDivider>3yearsZ Design</ArkDivider>
                <span>{t('currentAdmin', { email: currentUser.email })}</span>
              </div>
            </RevealItem>
          </div>
        </CollapsingHero>

        <section className="px-4 sm:px-6 md:px-8 py-12 sm:py-16">
          <div className="max-w-[1600px] mx-auto w-full md:pl-[72px] lg:pl-[88px]">
            {/* ============ 桌面端展开态 Tab 切换栏（与折叠态悬浮胶囊互补） ============ */}
            <div className="hidden md:block mb-10 pb-6 border-b border-[var(--border)]">
              <SectionNav
                options={adminTabs.map((t) => ({ value: t.key, label: t.label, num: t.num }))}
                value={activeTab}
                onChange={(key) => setActiveTab(key as AdminTab)}
                layoutClassName="flex flex-wrap gap-x-6 gap-y-4"
              />
            </div>

            {/* ============ Tab 00 — 角色权限管理（仅 root） ============ */}
            {activeTab === 'roles' && isRootAdmin && (
              <AdminRolesPanel onForbidden={handleForbidden} />
            )}

            {/* ============ Tab 01 — 用户管理 ============ */}
            {activeTab === 'users' && (
              <AdminUsersPanel currentUser={currentUser} onForbidden={handleForbidden} />
            )}

            {/* ============ Tab 02 — 消息管理（通知 + 公告） ============ */}
            {activeTab === 'messages' && (
              <AdminMessagesPanel onForbidden={handleForbidden} />
            )}

            {/* ============ Tab 03 — 入社申请审核 ============ */}
            {activeTab === 'join' && (
              <AdminJoinPanel onForbidden={handleForbidden} />
            )}

            {/* ============ Tab 04 — 日志管理（仅 root） ============ */}
            {activeTab === 'logs' && isRootAdmin && (
              <AdminLogsPanel onForbidden={handleForbidden} />
            )}

            {/* ============ Tab 05 — 功能模块可见性（仅 root） ============ */}
            {activeTab === 'feature-visibility' && isRootAdmin && (
              <AdminFeatureVisibilityPanel onForbidden={handleForbidden} />
            )}
          </div>
        </section>
      </main>
      </VisibilityGate>
    </ToastProvider>
  );
}
