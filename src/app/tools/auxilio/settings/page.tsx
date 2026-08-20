/**
 * @file 学习助手「用量与设置」独立详情页（/tools/auxilio/settings）。
 * 遵循工具区页面规范（折叠 Hero + pixel-page + section，参照 /tools/exam）；
 * 承载 LLM 用量统计 + 模型接入设置（API Key / 联网搜索 / 轨迹记录开关）。
 */
'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Title, ArkDivider } from '@/components';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import LlmUsageStats from '@/modules/workbench/widgets/llm-usage-stats';

export default function AuxilioSettingsPage() {
  const t = useTranslations('workbench');
  const { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick } = useCollapsingHero();
  const hero: HeroState = { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick };

  return (
    <main className="relative pt-16 pixel-page">
      {/* ============ [ 00 ] Hero ============ */}
      <CollapsingHero
        index="00"
        label={t('llmUsageEntry')}
        hero={hero}
        pageKey="auxilio"
        minHeight="40vh"
        sidebarBottom={
          <Link
            href="/tools/auxilio"
            className="meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors inline-block mt-2 text-[11px]"
          >
            {t('settingsBack')}
          </Link>
        }
      >
        <RevealTitle>
          <Title
            level={1}
            collapsed={hero.collapsed}
            collapsedSize="cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2]"
            expandedSize="text-[clamp(36px,9vw,120px)] leading-[1.05] sm:leading-[0.95]"
            echo={`${t('llmUsageEntry')} ${t('agentEn')}`}
            subtitle={t('agentEn')}
            onClick={hero.collapsed ? hero.onTitleClick : undefined}
          >
            {t('llmUsageEntry')}
          </Title>
        </RevealTitle>
        <RevealItem>
          <div
            className={`overflow-hidden transition-all hero-reveal ${
              hero.collapsed ? 'max-h-[14px] opacity-30 mt-1' : 'max-h-[200px] opacity-100 mt-8 sm:mt-12'
            }`}
          >
            <p className="max-w-2xl text-[var(--muted-foreground)] leading-[1.8] line-clamp-1 transition-all hero-reveal text-[15px] sm:text-[16px]">
              {t('llmSettings')} · {t('webSearchToggle')} · {t('trajectoryToggle')}
            </p>
          </div>
        </RevealItem>
      </CollapsingHero>

      {/* ============ [ 01 ] 用量与设置 ============ */}
      <section
        data-section-nav="01|用量与设置"
        className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]"
      >
        <div className="max-w-[1100px] mx-auto w-full md:pl-[72px] lg:pl-[88px]">
          <Title
            level={2}
            className="text-[clamp(28px,5vw,56px)] mb-4"
            echo={`${t('llmUsageTitleShort')} ${t('agentEn')}`}
          >
            {t('llmUsageTitleShort')}
            <ArkDivider className="ml-2">{t('agentEn')}</ArkDivider>
          </Title>
          <p className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)] text-[13px] mb-10 sm:mb-16">
            {t('llmProvider')} · {t('llmApiKey')} · {t('webSearchToggle')} · {t('trajectoryToggle')}
          </p>
          <LlmUsageStats />
        </div>
      </section>
    </main>
  );
}
