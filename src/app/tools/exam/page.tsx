/**
 * @file 考试列表页（/tools/exam）— 胶囊侧边栏按状态分类（进行中/即将开始/已结束）
 */

'use client';

import Link from 'next/link';
import { Badge, Title, ArkDivider } from '@/components';
import { GraduationCap, Clock } from 'lucide-react';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { type CapsuleTab } from '@/components/layout/floating-capsule-sidebar';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { TECH_TAGS } from '@/shared/utils/tech-tags';

type ExamTab = 'ongoing' | 'upcoming' | 'ended';

type TFn = (key: string, values?: Record<string, string | number | Date>) => string;

function formatDuration(minutes: number, t: TFn): string {
  if (minutes <= 0) return t('durUnlimited');
  if (minutes < 60) return t('durMin', { min: minutes });
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? t('durHm', { h, m }) : t('durH', { h });
}

interface ExamItem {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'published' | 'ended';
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number;
  techTags: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export default function ExamListPage() {
  const t = useTranslations('toolsExam');
  const { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick } = useCollapsingHero();

  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  };
  const [activeTab, setActiveTab] = useState<ExamTab>('ongoing');
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const examTabs: CapsuleTab[] = [
    { key: 'ongoing', num: '01', label: t('tabOngoing') },
    { key: 'upcoming', num: '02', label: t('tabUpcoming') },
    { key: 'ended', num: '03', label: t('tabEnded') },
  ];

  const fetchExams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tools/exam');
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      setExams(data.exams ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
      setExams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  const now = new Date();

  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      if (activeTab === 'ended') return exam.status === 'ended';
      if (exam.status !== 'published') return false;
      const start = exam.startTime ? new Date(exam.startTime) : null;
      const end = exam.endTime ? new Date(exam.endTime) : null;
      if (activeTab === 'ongoing') {
        if (start && start > now) return false;
        if (end && end < now) return false;
        return true;
      }
      if (activeTab === 'upcoming') {
        return start !== null && start > now;
      }
      return false;
    });
  }, [exams, activeTab, now]);

  return (
    <main className="relative pt-16 pixel-page">
      {/* ============ [ 00 ] Hero ============ */}
      <CollapsingHero
        index="00"
        label={t('heroTitle')}
        hero={hero}
        pageKey="exam"
        minHeight="50vh"
        capsule={{
          tabs: examTabs,
          activeKey: activeTab,
          onTabChange: (key) => setActiveTab(key as ExamTab),
        }}
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
          <Title
            level={1}
            collapsed={hero.collapsed}
            collapsedSize="cursor-pointer text-[clamp(22px,4vw,36px)] leading-[1.2]"
            expandedSize="text-[clamp(36px,9vw,120px)] leading-[1.05] sm:leading-[0.95]"
            echo={`${t('heroTitle')} ${t('heroTitleEn')}`}
            subtitle={t('heroTitleEn')}
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
              。
            </p>
          </div>
        </RevealItem>
      </CollapsingHero>

      {/* ============ [ 01 ] 考试列表 ============ */}
      <section data-section-nav="01|考试列表" className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto w-full md:pl-[72px] lg:pl-[88px]">
          <div>
            <Title
              level={2}
              className="text-[clamp(28px,5vw,56px)] mb-4"
              echo={activeTab === 'ongoing' ? `${t('listOngoing')} ${t('listOngoingEn')}` : activeTab === 'upcoming' ? `${t('listUpcoming')} ${t('listUpcomingEn')}` : `${t('listEnded')} ${t('listEndedEn')}`}
            >
              {activeTab === 'ongoing' && t('listOngoing')}
              {activeTab === 'upcoming' && t('listUpcoming')}
              {activeTab === 'ended' && t('listEnded')}
              <ArkDivider className="ml-2">
                {activeTab === 'ongoing' && t('listOngoingEn')}
                {activeTab === 'upcoming' && t('listUpcomingEn')}
                {activeTab === 'ended' && t('listEndedEn')}
              </ArkDivider>
            </Title>
            <p className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)] text-[13px] mb-10 sm:mb-16">
              {activeTab === 'ongoing' && t('countOngoing', { count: filteredExams.length })}
              {activeTab === 'upcoming' && t('countUpcoming', { count: filteredExams.length })}
              {activeTab === 'ended' && t('countEnded', { count: filteredExams.length })}
            </p>

            {/* Loading */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="card-minimal animate-pulse h-44" />
                ))}
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="py-16 text-center">
                <div className="meta-mono text-[var(--destructive)] mb-6">{error}</div>
                <button onClick={fetchExams} className="meta-mono text-[var(--primary)] underline-grow">
                  {t('retry')}
                </button>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && filteredExams.length === 0 && (
              <div className="py-16 text-center">
                <div className="meta-mono text-[var(--muted-foreground)] mb-6">
                  {activeTab === 'ongoing' && t('emptyOngoing')}
                  {activeTab === 'upcoming' && t('emptyUpcoming')}
                  {activeTab === 'ended' && t('emptyEnded')}
                </div>
                <Link
                  href="/tools"
                  className="meta-mono text-[var(--primary)] underline-grow"
                >
                  {t('backToTools')}
                </Link>
              </div>
            )}

            {/* Exam Cards */}
            {!loading && !error && filteredExams.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredExams.map((exam) => {
                  const tags: string[] = exam.techTags ?? [];
                  return (
                    <Link
                      key={exam.id}
                      href={`/tools/exam/${exam.id}`}
                      className="block p-6 border border-[var(--border)] card-minimal hover:bg-[var(--primary)]/[0.03] transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-[var(--primary)]" />
                          <Badge variant={activeTab === 'ongoing' ? 'success' : activeTab === 'upcoming' ? 'amber' : 'muted'}>
                            {activeTab === 'ongoing' ? t('badgeOngoing') : activeTab === 'upcoming' ? t('badgeUpcoming') : t('badgeEnded')}
                          </Badge>
                        </div>
                        {exam.startTime && (
                          <span className="meta-mono text-[10px] text-[var(--muted-foreground)] shrink-0">
                            {new Date(exam.startTime).toLocaleDateString('zh-CN', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                      </div>

                      <h3 className="display-serif text-[18px] sm:text-[20px] text-[var(--foreground)] mb-1 group-hover:text-[var(--primary)] transition-colors line-clamp-1">
                        {exam.title}
                      </h3>

                      {exam.description && (
                        <p className="text-[13px] text-[var(--muted-foreground)] leading-[1.6] line-clamp-2 mb-3">
                          {exam.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="meta-mono text-[10px] text-[var(--muted-foreground)] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(exam.durationMinutes, t)}
                        </span>
                        {tags.slice(0, 3).map((tag, i) => (
                          <span
                            key={`${tag}-${i}`}
                            className="meta-mono text-[10px] px-2 py-0.5 border border-[var(--border)] text-[var(--muted-foreground)]"
                          >
                            {TECH_TAGS.find((t) => t.key === tag)?.label ?? tag}
                          </span>
                        ))}
                        {tags.length > 3 && (
                          <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">
                            +{tags.length - 3}
                          </span>
                        )}
                      </div>

                      <div className="mt-4 text-[var(--primary)] meta-mono text-[12px] opacity-0 group-hover:opacity-100 transition-opacity">
                        {t('enterExam')}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}