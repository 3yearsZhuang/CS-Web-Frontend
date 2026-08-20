/**
 * @file 全量 Agent 页（/tools/auxilio）— 完整学习助手能力。
 * 遵循工具区页面规范（折叠 Hero + pixel-page + section 布局，参照 /tools/exam）：
 * full 对话（会话列表 + 工具调用可视化）+ Agent 预设切换 + Trajectory 回放；
 * 「用量与设置」跳转独立详情页 /tools/auxilio/settings。
 */
'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { BarChart3, History, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { BackLink } from '@/components';
import { Title, ArkDivider } from '@/components';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { Button } from '@/components/primitives/button';
import AssistantChat from '@/modules/auxilio/ui/assistant-chat';
import TrajectoryPanel from '@/modules/auxilio/ui/trajectory-panel';

const PRESET_OPTIONS = [
  { id: 'general', labelKey: 'presetGeneral' },
  { id: 'exam_sprint', labelKey: 'presetExamSprint' },
  { id: 'resource_finder', labelKey: 'presetResourceFinder' },
  { id: 'web_research', labelKey: 'presetWebResearch' },
] as const;

export default function AuxilioPage() {
  const t = useTranslations('workbench');
  const { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick } = useCollapsingHero();
  const hero: HeroState = { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick };
  const [presetId, setPresetId] = useState<string | null>(null);
  const [activeConv, setActiveConv] = useState<number | null>(null);
  const [showReplay, setShowReplay] = useState(false);

  return (
    <main className="relative pt-16 pixel-page">
      {/* ============ [ 00 ] Hero ============ */}
      <CollapsingHero
        index="00"
        label={t('agentTitle')}
        hero={hero}
        pageKey="auxilio"
        minHeight="50vh"
        sidebarBottom={
          <BackLink href="/tools">{t('agentBackTools')}</BackLink>
        }
      >
        <RevealTitle>
          <Title
            level={1}
            collapsed={hero.collapsed}
            collapsedSize="cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2]"
            expandedSize="text-[clamp(36px,9vw,120px)] leading-[1.05] sm:leading-[0.95]"
            echo={`${t('agentTitle')} ${t('agentEn')}`}
            subtitle={t('agentEn')}
            onClick={hero.collapsed ? hero.onTitleClick : undefined}
          >
            {t('agentTitle')}
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
            <p className="max-w-2xl text-[var(--muted-foreground)] leading-[1.8] line-clamp-1 transition-all hero-reveal text-[15px] sm:text-[16px]">
              {t('chatIntro')}
            </p>
          </div>
        </RevealItem>
      </CollapsingHero>

      {/* ============ [ 01 ] 对话 ============ */}
      <section data-section-nav="01|对话" className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto w-full md:pl-[72px] lg:pl-[88px]">
          <Title
            level={2}
            className="text-[clamp(28px,5vw,56px)] mb-4"
            echo={`${t('agentChatSection')} ${t('agentEn')}`}
          >
            {t('agentChatSection')}
            <ArkDivider className="ml-2">{t('agentEn')}</ArkDivider>
          </Title>
          <p className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)] text-[13px] mb-10 sm:mb-16">
            {t('presetLabel')} · {t('replay')} · {t('llmUsageEntry')}
          </p>

          {/* 控件行：预设切换 + 轨迹回放 + 用量与设置（独立设置页） */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <label className="flex items-center gap-1.5 text-[13px]">
              <span className="text-[var(--muted-foreground)]">{t('presetLabel')}</span>
              <select
                value={presetId ?? ''}
                onChange={(e) => setPresetId(e.target.value || null)}
                className="bg-[var(--background)] border border-[var(--border)] rounded-md px-2 py-1.5 text-[13px]"
              >
                <option value="">{t('presetAuto')}</option>
                {PRESET_OPTIONS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {t(p.labelKey)}
                  </option>
                ))}
              </select>
            </label>

            <Button
              size="sm"
              variant={showReplay ? 'pixel' : 'pixel-outline'}
              disabled={activeConv == null}
              onClick={() => setShowReplay((v) => !v)}
            >
              {showReplay ? <RotateCcw className="w-4 h-4" /> : <History className="w-4 h-4" />}
              {t('replay')}
            </Button>

            <Link
              href="/tools/auxilio/settings"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[var(--border)] text-[12px] font-medium hover:bg-[var(--border)]/40"
            >
              <BarChart3 className="w-4 h-4" />
              {t('llmUsageEntry')}
            </Link>
          </div>

          <AssistantChat
            mode="full"
            presetId={presetId}
            onActiveConversation={(id) => {
              setActiveConv(id);
              if (id == null) setShowReplay(false);
            }}
          />

          {showReplay && (
            <div className="mt-6">
              <TrajectoryPanel conversationId={activeConv} onClose={() => setShowReplay(false)} />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
