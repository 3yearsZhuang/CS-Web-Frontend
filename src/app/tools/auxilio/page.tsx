/**
 * @file Auxilio 学习成长 Agent（/tools/auxilio）— 规则引擎 MVP：考试薄弱点 → 资源推荐
 */

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { Button, SectionLoading } from '@/components';
import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface WeaknessTag {
  tag: string;
  total: number;
  correct: number;
  accuracy: number;
}

interface RecommendedResource {
  id: string;
  title: string;
  url: string;
  description: string | null;
  resourceType: string;
  techTags: string[];
  matchedTag: string;
}

interface AuxilioAnalysis {
  summary: string;
  totalQuestions: number;
  totalCorrect: number;
  overallAccuracy: number;
  weaknesses: WeaknessTag[];
  recommendations: RecommendedResource[];
}

export function resourceTypeLabel(t: (key: string) => string, key: string): string {
  const map: Record<string, string> = {
    article: t('resTypeArticle'),
    video: t('resTypeVideo'),
    course: t('resTypeCourse'),
    tool: t('resTypeTool'),
    book: t('resTypeBook'),
    other: t('resTypeOther'),
  };
  return map[key] ?? key;
}

export default function AuxilioPage() {
  const router = useRouter();
  const t = useTranslations('toolsAuxilio');
  const { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick } = useCollapsingHero();

  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  };

  const [analysis, setAnalysis] = useState<AuxilioAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notLoggedIn, setNotLoggedIn] = useState(false);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tools/auxilio');
      if (res.status === 401) {
        setNotLoggedIn(true);
        return;
      }
      if (!res.ok) throw new Error(t('loadFailed'));
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('loadFailed'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  if (loading) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center">
        <SectionLoading label="Loading..." />
      </main>
    );
  }

  if (notLoggedIn) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="meta-mono text-[var(--muted-foreground)] mb-4">[ {t('notLoggedIn')} ]</div>
          <p className="text-[14px] text-[var(--muted-foreground)] mb-8">
            {t('loginPrompt')}
          </p>
          <Button onClick={() => router.push('/login')}>
            <span>{t('login')}</span>
            <span>→</span>
          </Button>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="relative pt-16 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="meta-mono text-[var(--destructive)] mb-4">{error}</div>
          <button
            onClick={fetchAnalysis}
            className="meta-mono text-[var(--primary)] underline-grow"
          >
            {t('retry')}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative pt-16">
      {/* ============ Hero ============ */}
      <CollapsingHero
        index="00"
        label="Auxilio"
        hero={hero}
        pageKey="auxilio"
        minHeight="45vh"
        sidebarBottom={
          <Link
            href="/tools"
            className="meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors inline-block mt-2 text-[11px]"
          >
            ← {t('back')}
          </Link>
        }
      >
        <RevealTitle>
          <h1
            className={`display-serif text-[var(--foreground)] transition-all hero-reveal ${
              hero.collapsed
                ? 'cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2]'
                : 'text-[clamp(36px,7vw,88px)] leading-[1.05] sm:leading-[0.95]'
            }`}
            onClick={hero.collapsed ? hero.onTitleClick : undefined}
          >
            Auxilio
            <span className="text-[var(--primary)]"> {t('heroTitle1')}</span>
            <span
              className={`display-serif italic text-[var(--muted-foreground)] transition-all hero-reveal ${
                hero.collapsed
                  ? 'text-[clamp(12px,1.6vw,18px)] ml-2 align-baseline'
                  : 'text-[clamp(14px,2vw,24px)] ml-3 align-baseline'
              }`}
            >
              / Agent
            </span>
          </h1>
        </RevealTitle>
        <RevealItem>
          <div
            className={`overflow-hidden transition-all hero-reveal ${
              hero.collapsed ? 'max-h-[14px] opacity-30 mt-1' : 'max-h-[200px] opacity-100 mt-6 sm:mt-10'
            }`}
          >
            <p
              className={`max-w-2xl text-[var(--muted-foreground)] leading-[1.8] line-clamp-1 transition-all hero-reveal ${
                hero.collapsed ? 'text-[9px]' : 'text-[15px] sm:text-[16px]'
              }`}
            >
              {t('heroDesc1')}
              <span className="serif-italic text-[var(--foreground)]">{t('heroDesc2')}</span>
              。
            </p>
          </div>
        </RevealItem>
      </CollapsingHero>

      {/* ============ 分析结果 ============ */}
      <section className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto w-full">
          {analysis && (
            <>
              {/* 总览统计 */}
              <div className="grid grid-cols-12 gap-0 mb-10 sm:mb-16">
                <div className="col-span-12 md:col-span-2">
                  <div className="section-marker">[ 01 ]</div>
                </div>
                <div className="col-span-12 md:col-span-10">
                  <h2 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)] leading-[1.05]">
                    {t('analysisTitle1')}
                    <span className="text-[var(--primary)]">{t('analysisTitle2')}</span>
                    <span className="text-[var(--muted-foreground)]">{t('analysisTitleEn')}</span>
                  </h2>
                </div>
              </div>

              {/* 总结 */}
              <div className="mb-8 p-6 border border-[var(--border)]">
                <p className="text-[15px] text-[var(--foreground)] leading-[1.8]">
                  {analysis.summary}
                </p>
              </div>

              {/* 统计卡片 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-12">
                <div className="border border-[var(--border)] p-5 text-center">
                  <div className="meta-mono text-[var(--muted-foreground)] mb-2">{t('statTotal')}</div>
                  <div className="display-serif text-[clamp(28px,4vw,40px)] text-[var(--foreground)]">
                    {analysis.totalQuestions}
                  </div>
                </div>
                <div className="border border-[var(--border)] p-5 text-center">
                  <div className="meta-mono text-[var(--muted-foreground)] mb-2">{t('statCorrect')}</div>
                  <div className="display-serif text-[clamp(28px,4vw,40px)] text-[var(--primary)]">
                    {analysis.totalCorrect}
                  </div>
                </div>
                <div className="border border-[var(--border)] p-5 text-center">
                  <div className="meta-mono text-[var(--muted-foreground)] mb-2">{t('statAccuracy')}</div>
                  <div className="display-serif text-[clamp(28px,4vw,40px)] text-[var(--foreground)]">
                    {Math.round(analysis.overallAccuracy * 100)}%
                  </div>
                </div>
              </div>

              {/* 薄弱标签 */}
              {analysis.weaknesses.length > 0 && (
                <>
                  <div className="grid grid-cols-12 gap-0 mb-8">
                    <div className="col-span-12 md:col-span-2">
                      <div className="section-marker">[ 02 ]</div>
                    </div>
                    <div className="col-span-12 md:col-span-10">
                      <h3 className="display-serif text-[clamp(20px,3vw,32px)] text-[var(--foreground)] mb-6">
                        {t('weakTitle1')}
                        <span className="text-[var(--primary)]">{t('weakTitle2')}</span>
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-3 mb-12">
                    {analysis.weaknesses.map((w) => (
                      <div
                        key={w.tag}
                        className="border border-[var(--border)] p-4 flex items-center justify-between"
                      >
                        <div>
                          <span className="tag-badge mr-2">{w.tag}</span>
                          <span className="meta-mono text-[12px] text-[var(--muted-foreground)]">
                            {w.correct}/{w.total} {t('correctLabel')}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-1.5 bg-[var(--border)] overflow-hidden">
                            <div
                              className="h-full bg-[var(--primary)] transition-all"
                              style={{ width: `${Math.round(w.accuracy * 100)}%` }}
                            />
                          </div>
                          <span className="meta-mono text-[12px] text-[var(--muted-foreground)] w-10 text-right">
                            {Math.round(w.accuracy * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* 推荐资源 */}
              {analysis.recommendations.length > 0 && (
                <>
                  <div className="grid grid-cols-12 gap-0 mb-8">
                    <div className="col-span-12 md:col-span-2">
                      <div className="section-marker">[ 03 ]</div>
                    </div>
                    <div className="col-span-12 md:col-span-10">
                      <h3 className="display-serif text-[clamp(20px,3vw,32px)] text-[var(--foreground)] mb-6">
                        推荐
                        <span className="text-[var(--primary)]">资源</span>
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {analysis.recommendations.map((r) => (
                      <a
                        key={r.id}
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="card-minimal group block focus-amber"
                      >
                        <article className="border border-[var(--border)] p-5 hover:border-[var(--primary)] transition-colors">
                          <div className="flex items-start justify-between mb-2">
                            <span className="meta-mono text-[10px] text-[var(--primary)]">
                              {r.matchedTag}
                            </span>
                            <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                              {resourceTypeLabel(t, r.resourceType)}
                            </span>
                          </div>
                          <h4 className="display-serif text-[16px] text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors mb-2">
                            {r.title}
                          </h4>
                          {r.description && (
                            <p className="text-[13px] text-[var(--muted-foreground)] leading-[1.6] line-clamp-2">
                              {r.description}
                            </p>
                          )}
                        </article>
                      </a>
                    ))}
                  </div>
                </>
              )}

              {analysis.totalQuestions === 0 && (
                <div className="py-12 text-center meta-mono text-[var(--muted-foreground)]">
                  {t('noExam')}
                  <Link
                    href="/tools/exam"
                    className="ml-2 text-[var(--primary)] underline-grow"
                  >
                    {t('goExam')}
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </main>
  );
}