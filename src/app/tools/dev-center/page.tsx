/**
 * @file 开发者中心（/tools/dev-center）— 开发文档 + 组件注册表双 tab
 *
 * admin：仅可见开发文档（只读）
 * root：可见两个 tab，文档可编辑，组件注册表为 root 专属
 */

'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import type { SafeUser } from '@/modules/admin/ui/types';
import { DevDocsViewer } from '@/modules/tools/ui/dev-docs-viewer';
import { ComponentRegistryShell } from '@/modules/tools/ui/component-registry-shell';

type DevTab = 'docs' | 'registry';

export default function DevCenterPage() {
  const t = useTranslations('toolsDevCenter');
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
  const [activeTab, setActiveTab] = useState<DevTab>('docs');

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

  const isRoot = currentUser?.role === 'root';

  return (
    <main className="relative pt-16">
      {/* ============ [ 00 ] Hero ============ */}
      <CollapsingHero
        index="00"
        label={t('heroLabel')}
        hero={hero}
        pageKey="dev-center"
        minHeight="50vh"
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
            {t('heroTitle')}
            <span
              className={`display-serif italic text-[var(--muted-foreground)] transition-all hero-reveal ${
                hero.collapsed
                  ? 'text-[clamp(12px,1.6vw,18px)] ml-2 align-baseline'
                  : 'text-[clamp(14px,2vw,24px)] ml-3 align-baseline'
              }`}
            >
              / Dev Center
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
            </p>
          </div>
        </RevealItem>
      </CollapsingHero>

      {/* ============ [ 01 ] Tab 切换 ============ */}
      <section className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto w-full md:pl-[72px] lg:pl-[88px]">
          {/* Tab 按钮 */}
          <div className="flex items-center gap-6 mb-8 border-b border-[var(--border)] pb-4">
            <button
              type="button"
              onClick={() => setActiveTab('docs')}
              className={`meta-mono text-[12px] tracking-wider transition-colors ${
                activeTab === 'docs'
                  ? 'text-[var(--primary)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              [ {t('tabDocs')} ]
            </button>
            {isRoot && (
              <button
                type="button"
                onClick={() => setActiveTab('registry')}
                className={`meta-mono text-[12px] tracking-wider transition-colors ${
                  activeTab === 'registry'
                    ? 'text-[var(--primary)]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                [ {t('tabRegistry')} ]
                <span className="ml-2 text-[9px] px-1.5 py-0.5 border border-amber-500/40 text-amber-500">
                  {t('rootBadge')}
                </span>
              </button>
            )}
          </div>

          {/* Tab 内容 */}
          {activeTab === 'docs' && <DevDocsViewer isRoot={isRoot} />}
          {activeTab === 'registry' && isRoot && <ComponentRegistryShell embedded />}
        </div>
      </section>
    </main>
  );
}
