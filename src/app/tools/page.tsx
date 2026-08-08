/**
 * @file 工具集入口页（/tools）— 工作台 + 工具入口收编
 * 顶部为个人工作台（问候条/今日任务/番茄钟×播放器/倒计时/便签），
 * 底部保留原工具入口网格（可用/即将上线/规划中/管理）。
 */

'use client';

import Link from 'next/link';
import { GraduationCap, BookOpen, Bot, ClipboardList, MessageCircle, MessageSquare, Code2 } from 'lucide-react';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { type CapsuleTab } from '@/components/layout/floating-capsule-sidebar';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { AdminToolsPanel } from '@/modules/tools/ui/admin-tools-panel';
import { Workbench } from '@/modules/workbench/workbench';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { useTranslations } from 'next-intl';
import type { SafeUser } from '@/modules/admin/ui/types';
import { useEffect, useMemo, useState } from 'react';

type ToolTab = 'available' | 'coming-soon' | 'planned' | 'admin';

interface ToolCard {
  href: string;
  icon: React.ReactNode;
  titleKey: string;
  enKey: string;
  descKey: string;
  status: ToolTab;
}

const TOOLS: ToolCard[] = [
  {
    href: '/tools/exam',
    icon: <GraduationCap className="w-5 h-5" />,
    titleKey: 'examTitle',
    enKey: 'examEn',
    descKey: 'examDesc',
    status: 'available',
  },
  {
    href: '/tools/resource',
    icon: <BookOpen className="w-5 h-5" />,
    titleKey: 'resourceTitle',
    enKey: 'resourceEn',
    descKey: 'resourceDesc',
    status: 'available',
  },
  {
    href: '/tools/auxilio',
    icon: <Bot className="w-5 h-5" />,
    titleKey: 'auxilioTitle',
    enKey: 'auxilioEn',
    descKey: 'auxilioDesc',
    status: 'available',
  },
  {
    href: '/tools/task',
    icon: <ClipboardList className="w-5 h-5" />,
    titleKey: 'taskTitle',
    enKey: 'taskEn',
    descKey: 'taskDesc',
    status: 'available',
  },
  {
    href: '/tools/dev-center',
    icon: <Code2 className="w-5 h-5" />,
    titleKey: 'devCenterTitle',
    enKey: 'devCenterEn',
    descKey: 'devCenterDesc',
    status: 'available',
  },
  {
    href: '/community',
    icon: <MessageSquare className="w-5 h-5" />,
    titleKey: 'communityTitle',
    enKey: 'communityEn',
    descKey: 'communityDesc',
    status: 'available',
  },
  {
    href: '',
    icon: <MessageCircle className="w-5 h-5" />,
    titleKey: 'chatTitle',
    enKey: 'chatEn',
    descKey: 'chatDesc',
    status: 'planned',
  },
];

/** 状态翻译 key（组件内解析） */
function statusLabelKey(status: ToolTab): string {
  switch (status) {
    case 'available':
      return 'statusAvailable';
    case 'coming-soon':
      return 'statusComingSoon';
    case 'planned':
      return 'statusPlanned';
    default:
      return '';
  }
}

export default function ToolsPage() {
  const t = useTranslations('tools');
  const wt = useTranslations('workbench');
  const {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  } = useCollapsingHero();

  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  };

  const [currentUser, setCurrentUser] = useState<SafeUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { cache: 'no-store' })
      .then((res) => {
        if (res.status === 401) return null;
        if (!res.ok) return null;
        return res.json() as Promise<{ user: SafeUser }>;
      })
      .then((data) => {
        if (cancelled || !data) return;
        const user = data.user;
        if ((user.role === 'admin' || user.role === 'root') && user.isActive) {
          setCurrentUser(user);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const isAdmin = currentUser !== null;

  const [activeTab, setActiveTab] = useState('available' as ToolTab);

  const toolsTabs: CapsuleTab[] = useMemo(
    () => [
      { key: 'available', num: '01', label: t('tabAvailable') },
      { key: 'coming-soon', num: '02', label: t('tabComingSoon') },
      { key: 'planned', num: '03', label: t('tabPlanned') },
      ...(isAdmin ? [{ key: 'admin', num: '99', label: t('tabAdmin') }] : []),
    ],
    [isAdmin, t],
  );

  const filteredTools = useMemo(
    () => TOOLS.filter((t) => t.status === activeTab),
    [activeTab],
  );

  return (
    <main className="relative pt-16">
      {/* ============ [ 00 ] Hero ============ */}
      <CollapsingHero
        index="00"
        label={wt('wbTitle')}
        hero={hero}
        pageKey="tools"
        minHeight="50vh"
        capsule={{
          tabs: toolsTabs,
          activeKey: activeTab,
          onTabChange: (key) => setActiveTab(key as ToolTab),
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
            {wt('wbTitle')}
            <span
              className={`display-serif italic text-[var(--muted-foreground)] transition-all hero-reveal ${
                hero.collapsed
                  ? 'text-[clamp(12px,1.6vw,18px)] ml-2 align-baseline'
                  : 'text-[clamp(14px,2vw,24px)] ml-3 align-baseline'
              }`}
            >
              {wt('wbSubtitle')}
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
              {t('heroDesc1')}
              <span className="serif-italic text-[var(--foreground)]">
                {t('heroDesc2')}
              </span>
              。
            </p>
          </div>
        </RevealItem>
      </CollapsingHero>

      {/* ============ [ 01 ] 工作台 ============ */}
      <Workbench />
      <section data-section-nav="01|工具列表" className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto w-full md:pl-[72px] lg:pl-[88px]">
          <div>
            <h2 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)] mb-4">
              {activeTab === 'available' && wt('allTools')}
              {activeTab === 'coming-soon' && t('sectionTitleComingSoon')}
              {activeTab === 'planned' && t('sectionTitlePlanned')}
            </h2>
            <p className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)] text-[13px] mb-10 sm:mb-16">
              {activeTab === 'available' && wt('toolsHint')}
              {activeTab === 'coming-soon' && t('sectionDescComingSoon')}
              {activeTab === 'planned' && t('sectionDescPlanned')}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTools.map((tool) => {
                const isAvailable = tool.status === 'available';

                const CardContent = (
                  <div
                    className={`relative p-6 border border-[var(--border)] transition-colors ${
                      isAvailable
                        ? 'card-minimal cursor-pointer hover:bg-[var(--primary)]/[0.03]'
                        : 'opacity-40 cursor-default'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="text-[var(--primary)]">{tool.icon}</div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`meta-mono text-[10px] px-2 py-0.5 border ${
                            tool.status === 'available'
                              ? 'border-emerald-500/40 text-emerald-500'
                              : tool.status === 'coming-soon'
                                ? 'border-amber-500/40 text-amber-500'
                                : 'border-[var(--border)] text-[var(--muted-foreground)]'
                          }`}
                        >
                          {t(statusLabelKey(tool.status) as Parameters<typeof t>[0])}
                        </span>
                      </div>
                    </div>

                    <h3 className="display-serif text-[18px] sm:text-[20px] text-[var(--foreground)] mb-1">
                      {t(tool.titleKey as Parameters<typeof t>[0])}
                    </h3>
                    <p className="meta-mono text-[10px] sm:text-[11px] text-[var(--muted-foreground)] mb-3 uppercase tracking-wider">
                      {t(tool.enKey as Parameters<typeof t>[0])}
                    </p>

                    <p className="text-[13px] sm:text-[14px] text-[var(--muted-foreground)] leading-[1.7]">
                      {t(tool.descKey as Parameters<typeof t>[0])}
                    </p>

                    {isAvailable && (
                      <div className="mt-5 text-[var(--primary)] meta-mono text-[12px] group-hover:translate-x-1 transition-transform">
                        {t('enter')}
                      </div>
                    )}
                  </div>
                );

                if (isAvailable) {
                  return (
                    <Link key={tool.titleKey} href={tool.href}>
                      {CardContent}
                    </Link>
                  );
                }
                return <div key={tool.titleKey}>{CardContent}</div>;
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Tab 99 — 工具管理（仅管理员） */}
      {activeTab === 'admin' && currentUser && (
        <section className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]">
          <div className="max-w-[1600px] mx-auto w-full md:pl-[72px] lg:pl-[88px]">
            <AdminToolsPanel />
          </div>
        </section>
      )}
    </main>
  );
}