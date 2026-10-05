/**
 * @file Agent 自动化规则管理页（/tools/agent-rules）。
 * 工具区页面规范布局（折叠 Hero + pixel-page + section，参照 /tools/auxilio/settings）。
 */
'use client';

import { useTranslations } from 'next-intl';
import { BackLink } from '@/components';
import { Title, ArkDivider } from '@/components';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import AgentRulesPanel from '@/modules/agent/ui/rules-panel';

export default function AgentRulesPage() {
  const t = useTranslations('workbench');
  const { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick } = useCollapsingHero();
  const hero: HeroState = { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick };

  return (
    <main className="relative pt-16 pixel-page">
      {/* ============ [ 00 ] Hero ============ */}
      <CollapsingHero
        index="00"
        label={t('agentRulesEntry')}
        hero={hero}
        pageKey="agent-rules"
        minHeight="40vh"
        sidebarBottom={<BackLink href="/tools">{t('agentRulesBack')}</BackLink>}
      >
        <RevealTitle>
          <Title
            level={1}
            collapsed={hero.collapsed}
            collapsedSize="cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2]"
            expandedSize="text-[clamp(36px,9vw,120px)] leading-[1.05] sm:leading-[0.95]"
            echo={`${t('agentRulesEntry')} ${t('agentEn')}`}
            subtitle={t('agentEn')}
            onClick={hero.collapsed ? hero.onTitleClick : undefined}
          >
            {t('agentRulesEntry')}
          </Title>
        </RevealTitle>
        <RevealItem>
          <div
            className={`overflow-hidden transition-all hero-reveal ${
              hero.collapsed ? 'max-h-[14px] opacity-30 mt-1' : 'max-h-[200px] opacity-100 mt-8 sm:mt-12'
            }`}
          >
            <p className="max-w-2xl text-[var(--muted-foreground)] leading-[1.8] line-clamp-1 transition-all hero-reveal text-[15px] sm:text-[16px]">
              {t('agentRulesHint')}
            </p>
          </div>
        </RevealItem>
      </CollapsingHero>

      {/* ============ [ 01 ] 规则管理 ============ */}
      <section
        data-section-nav="01|规则管理"
        className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]"
      >
        <div className="max-w-[1100px] mx-auto w-full md:pl-[72px] lg:pl-[88px]">
          <Title
            level={2}
            className="text-[clamp(28px,5vw,56px)] mb-4"
            echo={`${t('agentRulesEntry')} ${t('agentEn')}`}
          >
            {t('agentRulesEntry')}
            <ArkDivider className="ml-2">{t('agentEn')}</ArkDivider>
          </Title>
          <p className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)] text-[13px] mb-10 sm:mb-16">
            {t('agentRulesEmptyHint')}
          </p>
          <AgentRulesPanel />
        </div>
      </section>
    </main>
  );
}
