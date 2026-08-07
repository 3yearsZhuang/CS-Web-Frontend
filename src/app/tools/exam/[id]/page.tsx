/**
 * @file 考试答题页（/tools/exam/[id]）— 装配层
 *
 * 遵循 GENERAL 2.2「展示/容器分离」、2.4「组件 > 500 行拆分」：
 * 本文件仅负责加载态、错误态与 Header/侧边栏/答题区的编排；
 * 全部状态与逻辑下放到 `useExam` Hook，渲染拆分到 QuestionList / QuestionPanel。
 */

'use client';

import { use } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button } from '@/components';
import { useExam } from './use-exam';
import { QuestionList } from './question-list';
import { QuestionPanel } from './question-panel';

export default function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations('toolsExam');
  const { id } = use(params);
  const exam = useExam(id);
  const {
    router,
    exam: detail,
    questions,
    loading,
    error,
    submitted,
    currentQuestionIdx,
    sidebarOpen,
    setSidebarOpen,
    timeRemaining,
    formatTime,
    correctCount,
    totalScore,
    maxScore,
  } = exam;

  if (loading) {
    return (
      <main className="relative pt-16">
        <div className="max-w-[1600px] mx-auto px-6 py-24">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-[var(--border)] rounded w-1/3" />
            <div className="h-4 bg-[var(--border)] rounded w-2/3" />
            <div className="h-48 bg-[var(--border)] rounded mt-8" />
          </div>
        </div>
      </main>
    );
  }

  if (error && !detail) {
    return (
      <main className="relative pt-16">
        <div className="max-w-[1600px] mx-auto px-6 py-24 text-center">
          <div className="meta-mono text-[var(--muted-foreground)] mb-4">[ ERROR ]</div>
          <h1 className="display-serif text-4xl mb-4">{error}</h1>
          <Button variant="outline" onClick={() => router.push('/tools/exam')}>
            {t('backToList')}
          </Button>
        </div>
      </main>
    );
  }

  if (!detail) return null;

  return (
    <main className="relative pt-16 min-h-screen">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-sm sticky top-16 z-40">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/tools/exam"
              className="meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors shrink-0"
            >
              ← {t('back')}
            </Link>
            <h1 className="text-lg font-semibold truncate">{detail.title}</h1>
            {timeRemaining !== null && (
              <span
                className={`meta-mono text-[13px] shrink-0 ${
                  timeRemaining < 300 ? 'text-red-500' : 'text-[var(--muted-foreground)]'
                }`}
              >
                {formatTime(timeRemaining)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {!submitted && (
              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors"
              >
                {sidebarOpen ? t('closeList') : t('questionNav', { current: currentQuestionIdx + 1, total: questions.length })}
              </button>
            )}
            {submitted && (
              <div className="meta-mono text-[13px] text-[var(--primary)]">
                {t('resultLine', { correct: correctCount, total: questions.length, score: totalScore, max: maxScore })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto flex">
        {/* 题目列表侧边栏 */}
        <QuestionList {...exam} />

        {/* 答题区域 */}
        <div className="flex-1 min-w-0">
          <QuestionPanel {...exam} />
        </div>
      </div>
    </main>
  );
}
