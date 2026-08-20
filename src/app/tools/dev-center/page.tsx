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
import { BackLink, GhostTitle, Title } from '@/components';
import type { SafeUser } from '@/modules/admin/ui/types';
import { apiRequest } from '@/shared/hooks/use-api-request';
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
    (async () => {
      const result = await apiRequest<{ user: SafeUser }>('/api/auth/me', {
        cache: 'no-store',
      });
      if (cancelled) return;
      if (result.status === 401 || !result.ok) return;
      const data = result.data!;
      const user = data.user;
      if ((user.role === 'admin' || user.role === 'root') && user.isActive) {
        setCurrentUser(user);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const isRoot = currentUser?.role === 'root';

  return (
    <main className="relative pt-16 pixel-page">
      {/* ============ [ 00 ] Hero ============ */}
      <CollapsingHero
        index="00"
        label={t('heroLabel')}
        hero={hero}
        pageKey="dev-center"
        minHeight="50vh"
        sidebarBottom={
          <BackLink href="/tools">{t('back')}</BackLink>
        }
      >
        <RevealTitle>
          <Title
            level={1}
            collapsed={hero.collapsed}
            collapsedSize="cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2]"
            expandedSize="text-[clamp(36px,9vw,120px)] leading-[1.05] sm:leading-[0.95]"
            echo={`${t('heroTitle')} / Dev Center`}
            subtitle="/ Dev Center"
            onClick={hero.collapsed ? hero.onTitleClick : undefined}
          >
            {t('heroTitle')}
          </Title>
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
