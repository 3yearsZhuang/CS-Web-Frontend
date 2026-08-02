/**
 * @file 考试列表页（/tools/exam）— 胶囊侧边栏按状态分类（进行中/即将开始/已结束）
 */

'use client';

import Link from 'next/link';
import { GraduationCap, Clock } from 'lucide-react';
import { RevealTitle, RevealItem } from '@/components/effects/motion-primitives';
import { type CapsuleTab } from '@/components/layout/floating-capsule-sidebar';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { TECH_TAGS } from '@/shared/utils/tech-tags';

type ExamTab = 'ongoing' | 'upcoming' | 'ended';

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

function formatDuration(minutes: number): string {
  if (minutes <= 0) return '不限时';
  if (minutes < 60) return `${minutes} 分钟`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function ExamListPage() {
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
    { key: 'ongoing', num: '01', label: '进行中' },
    { key: 'upcoming', num: '02', label: '即将开始' },
    { key: 'ended', num: '03', label: '已结束' },
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
    <main className="relative pt-16">
      {/* ============ [ 00 ] Hero ============ */}
      <CollapsingHero
        index="00"
        label="考试"
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
            ← 返回
          </Link>
        }
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
            考试
            <span
              className={`display-serif italic text-[var(--muted-foreground)] transition-all hero-reveal ${
                hero.collapsed
                  ? 'text-[clamp(12px,1.6vw,18px)] ml-2 align-baseline'
                  : 'text-[clamp(14px,2vw,24px)] ml-3 align-baseline'
              }`}
            >
              / Exam
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
              算法周赛 · 项目组考核 · 技术能力评估
              <span className="serif-italic text-[var(--foreground)]">
                。验证你的实力，发现你的薄弱点
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
            <h2 className="display-serif text-[clamp(28px,5vw,56px)] text-[var(--foreground)] mb-4">
              {activeTab === 'ongoing' && '进行中'}
              {activeTab === 'upcoming' && '即将开始'}
              {activeTab === 'ended' && '已结束'}
              <span className="ark-divider ml-2">
                {activeTab === 'ongoing' && 'Active'}
                {activeTab === 'upcoming' && 'Upcoming'}
                {activeTab === 'ended' && 'Archive'}
              </span>
            </h2>
            <p className="meta-mono normal-case tracking-normal text-[var(--muted-foreground)] text-[13px] mb-10 sm:mb-16">
              {activeTab === 'ongoing' && `// 当前可参与的考试 — ${filteredExams.length} 场`}
              {activeTab === 'upcoming' && `// 即将开始的考试 — ${filteredExams.length} 场`}
              {activeTab === 'ended' && `// 已结束的考试 — ${filteredExams.length} 场`}
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
                  重试
                </button>
              </div>
            )}

            {/* Empty */}
            {!loading && !error && filteredExams.length === 0 && (
              <div className="py-16 text-center">
                <div className="meta-mono text-[var(--muted-foreground)] mb-6">
                  {activeTab === 'ongoing' && '// 暂无进行中的考试'}
                  {activeTab === 'upcoming' && '// 暂无即将开始的考试'}
                  {activeTab === 'ended' && '// 暂无已结束的考试'}
                </div>
                <Link
                  href="/tools"
                  className="meta-mono text-[var(--primary)] underline-grow"
                >
                  返回工具集 ←
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
                          <span
                            className={`meta-mono text-[10px] px-2 py-0.5 border ${
                              activeTab === 'ongoing'
                                ? 'border-emerald-500/40 text-emerald-500'
                                : activeTab === 'upcoming'
                                  ? 'border-amber-500/40 text-amber-500'
                                  : 'border-[var(--border)] text-[var(--muted-foreground)]'
                            }`}
                          >
                            {activeTab === 'ongoing' ? '进行中' : activeTab === 'upcoming' ? '即将开始' : '已结束'}
                          </span>
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
                          {formatDuration(exam.durationMinutes)}
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
                        进入考试 →
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