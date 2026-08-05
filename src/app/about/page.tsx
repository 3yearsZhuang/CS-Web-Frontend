'use client'
/**
 * @file 关于页面
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { type CapsuleTab } from '@/components/layout/floating-capsule-sidebar';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { Button } from '@/components';
import Link from 'next/link';

type AboutTab = 'belief' | 'directions' | 'process';

interface BeliefItem { num: string; titleKey: string; descKey: string; tag: string; }
interface DirectionItem { num: string; nameKey: string; nameEn: string; tag: string; descKey: string; stack: string[]; }
interface RequirementItem { num: string; titleKey: string; descKey: string; tag: string; }
interface StepItem { num: string; titleKey: string; duration: string; descKey: string; details: string[]; }

const BELIEFS: BeliefItem[] = [
  { num: '01', titleKey: 'belief1Title', descKey: 'belief1Desc', tag: 'Project-First' },
  { num: '02', titleKey: 'belief2Title', descKey: 'belief2Desc', tag: 'Inclusive' },
  { num: '03', titleKey: 'belief3Title', descKey: 'belief3Desc', tag: 'Outcome-Driven' },
];

const DIRECTIONS: DirectionItem[] = [
  { num: '01', nameKey: 'dir1Name', nameEn: 'Web Development', tag: 'Frontend & Backend', descKey: 'dir1Desc', stack: ['React / Next.js', 'Vue / Nuxt', 'Node.js / Bun', 'PostgreSQL / Supabase'] },
  { num: '02', nameKey: 'dir2Name', nameEn: 'Competitive Programming', tag: 'ACM / ICPC', descKey: 'dir2Desc', stack: ['C++ / Rust', 'Dynamic Programming', 'Graph / Number Theory', 'Codeforces / AtCoder'] },
  { num: '03', nameKey: 'dir3Name', nameEn: 'AI & Machine Learning', tag: 'ML / Deep Learning', descKey: 'dir3Desc', stack: ['PyTorch / JAX', 'Transformers', 'Computer Vision', 'NLP / RAG'] },
  { num: '04', nameKey: 'dir4Name', nameEn: 'Systems & Security', tag: 'OS / Security', descKey: 'dir4Desc', stack: ['Linux Kernel', 'Rust / C', 'Pwn / Reverse', 'CTF / Pentest'] },
  { num: '05', nameKey: 'dir5Name', nameEn: 'Open Source', tag: 'Community', descKey: 'dir5Desc', stack: ['Git / GitHub', 'Code Review', 'License / Governance', 'CNCF / Apache'] },
  { num: '06', nameKey: 'dir6Name', nameEn: 'Creative Coding', tag: 'Generative Art', descKey: 'dir6Desc', stack: ['p5.js / Three.js', 'WebGL / Shader', 'Unity / Godot', 'Generative Art'] },
];

const REQUIREMENTS: RequirementItem[] = [
  { num: '01', titleKey: 'req1Title', descKey: 'req1Desc', tag: 'Passion' },
  { num: '02', titleKey: 'req2Title', descKey: 'req2Desc', tag: 'Self-Driven' },
  { num: '03', titleKey: 'req3Title', descKey: 'req3Desc', tag: 'Collaborative' },
  { num: '04', titleKey: 'req4Title', descKey: 'req4Desc', tag: 'Inclusive' },
];

const STEPS: StepItem[] = [
  { num: '01', titleKey: 'step1Title', duration: '5 min', descKey: 'step1Desc', details: ['Email Verify', 'Set Password', 'Profile'] },
  { num: '02', titleKey: 'step2Title', duration: '15 min', descKey: 'step2Desc', details: ['Interest', 'Background', 'Statement'] },
  { num: '03', titleKey: 'step3Title', duration: '20 min', descKey: 'step3Desc', details: ['Zoom / Tencent', '1:1 Chat', 'No Tech Test'] },
  { num: '04', titleKey: 'step4Title', duration: '1 day', descKey: 'step4Desc', details: ['Join Lab', 'Meet Peers'] },
];

export default function AboutPage() {
  const router = useRouter();
  const t = useTranslations('about');
  const [activeTab, setActiveTab] = useState<AboutTab>('belief');

  const aboutTabs: CapsuleTab[] = [
    { key: 'belief', num: '01', label: t('tabBelief') },
    { key: 'directions', num: '02', label: t('tabDirections') },
    { key: 'process', num: '03', label: t('tabProcess') },
  ];

  const { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick } = useCollapsingHero();

  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  };

  return (
    <main className="relative pt-16">
      {/* ============ Hero ============ */}
      <CollapsingHero
        index="00"
        label="About"
        hero={hero}
        pageKey="about"
        minHeight="70vh"
        capsule={{
          tabs: aboutTabs,
          activeKey: activeTab,
          onTabChange: (key) => setActiveTab(key as AboutTab),
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
            {t('heroTitle1')}
            <span className="text-[var(--primary)]">{t('heroTitle2')}</span>
            {t('heroTitle3')}
            <span
              className={`display-serif italic text-[var(--muted-foreground)] transition-all hero-reveal ${
                hero.collapsed
                  ? 'text-[clamp(12px,1.6vw,18px)] ml-2 align-baseline'
                  : 'text-[clamp(14px,2vw,24px)] ml-3 align-baseline'
              }`}
            >
              {t('heroTitleEn')}
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
              } animate-fade-up`}
            >
              {t('heroDesc1')}
              <span className="serif-italic text-[var(--foreground)]">{t('heroDesc2')}</span>
              {t('heroDesc3')}
            </p>
          </div>
        </RevealItem>
      </CollapsingHero>

      {/* ============ Tab 区 ============ */}
      <section className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto w-full md:pl-[72px] lg:pl-[88px]">
          <div>
            {activeTab === 'belief' && (
              <div>
                <h2 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)] mb-10 sm:mb-16">
                  {t('beliefTitle1')}<span className="text-[var(--primary)]">{t('beliefTitle2')}</span>{t('beliefTitle3')}
                </h2>
                {/* 子区块 1：信念 */}
                <h3 className="meta-mono text-[clamp(14px,1.5vw,18px)] text-[var(--primary)] mb-6 sm:mb-8 uppercase tracking-widest">
                  {t('beliefSection')}
                </h3>
                <div className="border-t border-[var(--border)]">
                  {BELIEFS.map((b) => (
                    <article
                      key={b.num}
                      className="grid grid-cols-12 gap-2 sm:gap-4 py-6 sm:py-8 border-b border-[var(--border)] card-minimal"
                    >
                      <div className="col-span-2 md:col-span-1">
                        <span className="meta-mono text-[var(--primary)]">{b.num}</span>
                      </div>
                      <div className="col-span-10 md:col-span-4">
                        <h3 className="text-[16px] sm:text-[18px] text-[var(--foreground)] tracking-tight">
                          {t(b.titleKey as Parameters<typeof t>[0])}
                        </h3>
                      </div>
                      <div className="col-span-12 md:col-span-6">
                        <p className="text-[13px] sm:text-[14px] text-[var(--muted-foreground)] leading-[1.7]">
                          {t(b.descKey as Parameters<typeof t>[0])}
                        </p>
                      </div>
                      <div className="col-span-12 md:col-span-1 text-right">
                        <span className="meta-mono text-[var(--muted-foreground)]">{b.tag}</span>
                      </div>
                    </article>
                  ))}
                </div>
                {/* 子区块 2：期望 */}
                <h3 className="meta-mono text-[clamp(14px,1.5vw,18px)] text-[var(--primary)] mb-6 sm:mb-8 mt-16 sm:mt-20 uppercase tracking-widest">
                  {t('expectationSection')}
                </h3>
                <div className="border-t border-[var(--border)]">
                  {REQUIREMENTS.map((req) => (
                    <article
                      key={req.num}
                      className="grid grid-cols-12 gap-2 sm:gap-4 py-6 sm:py-8 border-b border-[var(--border)] card-minimal"
                    >
                      <div className="col-span-2 md:col-span-1">
                        <span className="meta-mono text-[var(--primary)]">{req.num}</span>
                      </div>
                      <div className="col-span-10 md:col-span-4">
                        <h3 className="text-[16px] sm:text-[18px] text-[var(--foreground)] tracking-tight">
                          {t(req.titleKey as Parameters<typeof t>[0])}
                        </h3>
                      </div>
                      <div className="col-span-12 md:col-span-6">
                        <p className="text-[13px] sm:text-[14px] text-[var(--muted-foreground)] leading-[1.7]">
                          {t(req.descKey as Parameters<typeof t>[0])}
                        </p>
                      </div>
                      <div className="col-span-12 md:col-span-1 text-right">
                        <span className="meta-mono text-[var(--muted-foreground)]">{req.tag}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            )}

              {activeTab === 'directions' && (
                <div>
                  <h2 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)] mb-10 sm:mb-16">
                    {t('directionsTitle1')}
                    <br />
                    <span className="text-[var(--primary)]">{t('directionsTitle2')}</span>{t('directionsTitle3')}
                  </h2>
                  <RevealItem>
                    <p className="mb-8 sm:mb-12 max-w-2xl text-[var(--muted-foreground)] text-[15px] sm:text-[16px] leading-[1.8]">
                      {t('directionsDesc1')}
                      <span className="serif-italic text-[var(--foreground)]"> {t('directionsDesc2')}</span>
                      。
                    </p>
                  </RevealItem>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                    {DIRECTIONS.map((d) => (
                      <article
                        key={d.num}
                        className="group card-minimal border border-[var(--border)] p-5 sm:p-6 hover:border-[var(--primary)]/40 transition-colors flex flex-col"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="display-serif text-[clamp(28px,4vw,44px)] text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors leading-none">
                            {d.num}
                          </div>
                          <div className="meta-mono text-[var(--muted-foreground)] text-[11px] sm:text-[12px]">
                            {d.nameEn}
                          </div>
                        </div>
                        <h3 className="display-serif text-[clamp(18px,2vw,22px)] text-[var(--foreground)] mb-2">
                          {t(d.nameKey as Parameters<typeof t>[0])}
                        </h3>
                        <div className="meta-mono text-[var(--primary)] text-[11px] sm:text-[12px] mb-3">
                          {d.tag}
                        </div>
                        <p className="text-[13px] text-[var(--muted-foreground)] leading-[1.7] flex-1">
                          {t(d.descKey as Parameters<typeof t>[0])}
                        </p>
                        {d.stack.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-1.5">
                            {d.stack.map((s, i) => (
                              <span key={`${s}-${i}`} className="tag-badge text-[11px]">
                                {s}
                              </span>
                            ))}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'process' && (
                <div>
                  <h2 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)] mb-10 sm:mb-16">
                    {t('processTitle1')}<span className="text-[var(--primary)]">{t('processTitle2')}</span>。
                  </h2>
                  {/* 子区块 1：流程 */}
                  <h3 className="meta-mono text-[clamp(14px,1.5vw,18px)] text-[var(--primary)] mb-6 sm:mb-8 uppercase tracking-widest">
                    {t('processSection')}
                  </h3>
                  <div className="border-t border-[var(--border)]">
                    {STEPS.map((step, idx) => (
                      <article
                        key={step.num}
                        className="group grid grid-cols-12 gap-4 py-8 sm:py-12 border-b border-[var(--border)] card-minimal"
                      >
                        <div className="col-span-12 md:col-span-3">
                          <div className="display-serif text-[clamp(40px,7vw,80px)] text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors leading-none mb-2">
                            {step.num}
                          </div>
                          <div className="meta-mono text-[var(--muted-foreground)]">
                            {t('step', { current: idx + 1, total: STEPS.length })}
                          </div>
                        </div>
                        <div className="col-span-12 md:col-span-2 md:border-l md:border-r md:border-[var(--border)] md:pl-6 pb-4 md:pb-0 border-b md:border-b-0 border-[var(--border)]">
                          <div className="meta-mono mb-2">{t('duration')}</div>
                          <div className="text-[13px] font-mono text-[var(--primary)]">
                            {step.duration}
                          </div>
                        </div>
                        <div className="col-span-12 md:col-span-6">
                          <h3 className="display-serif text-[clamp(22px,3vw,28px)] text-[var(--foreground)] mb-3">
                            {t(step.titleKey as Parameters<typeof t>[0])}
                          </h3>
                          <p className="text-[14px] text-[var(--muted-foreground)] leading-[1.7] max-w-xl">
                            {t(step.descKey as Parameters<typeof t>[0])}
                          </p>
                          {step.details.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {step.details.map((d, i) => (
                                <span key={`${d}-${i}`} className="tag-badge">
                                  {d}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="hidden md:block md:col-span-1 text-right">
                          <span className="text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-1 inline-block transition-all">
                            →
                          </span>
                        </div>
                      </article>
                    ))}
                  </div>
                  {/* 子区块 2：加入 */}
                  <h3 className="meta-mono text-[clamp(14px,1.5vw,18px)] text-[var(--primary)] mb-6 sm:mb-8 mt-16 sm:mt-20 uppercase tracking-widest">
                    {t('joinSection')}
                  </h3>
                  <div className="border-t border-[var(--border)] pt-10 sm:pt-16">
                    <p className="text-[14px] sm:text-[15px] text-[var(--muted-foreground)] leading-[1.8] max-w-xl mb-8">
                      {t('processDesc')}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Button onClick={() => router.push('/join')}>
                        <span>{t('fillForm')}</span>
                        <span>→</span>
                      </Button>
                      <Button variant="outline" onClick={() => router.push('/login')}>
                        <span>{t('login')}</span>
                        <span>→</span>
                      </Button>
                    </div>
                  </div>
                </div>
              )}

            </div>
        </div>
      </section>
    </main>
  );
}
