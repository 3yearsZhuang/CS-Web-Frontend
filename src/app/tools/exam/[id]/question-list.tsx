'use client';

/**
 * @file QuestionList — 考试题目列表侧边栏（考试答题页子组件）
 *
 * 从 `app/tools/exam/[id]/page.tsx` 拆出（GENERAL 2.4「组件 > 500 行拆分」）。
 * 仅负责渲染；状态与逻辑由父页面注入的 `ExamState` 提供（GENERAL 2.2）。
 */

import { useTranslations } from 'next-intl';
import type { ExamState } from './use-exam';

export function QuestionList(props: ExamState) {
  const t = useTranslations('toolsExam');
  const { questions, answers, results, currentQuestionIdx, setCurrentQuestionIdx, sidebarOpen, setSidebarOpen } = props;

  return (
    <aside
      className={`${
        sidebarOpen ? 'fixed inset-0 z-50 bg-[var(--background)] pt-32' : 'hidden'
      } lg:relative lg:block lg:w-72 lg:min-w-[288px] border-r border-[var(--border)] lg:min-h-[calc(100vh-4rem)]`}
    >
      {sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="absolute top-20 right-4 meta-mono text-[11px] text-[var(--muted-foreground)] hover:text-[var(--primary)] lg:hidden"
        >
          ✕ {t('closeList')}
        </button>
      )}
      <div className="p-4">
        <div className="meta-mono text-[11px] text-[var(--muted-foreground)] mb-4">{t('listTitle')} ({questions.length})</div>
        <div className="space-y-1">
          {questions.map((q, idx) => {
            const hasAnswer = answers[q.id] !== undefined;
            const result = results[q.id];
            let bgClass = '';
            if (result?.isCorrect === true) bgClass = 'bg-emerald-500/10 border-emerald-500/30';
            else if (result?.isCorrect === false) bgClass = 'bg-red-500/10 border-red-500/30';
            else if (hasAnswer) bgClass = 'bg-[var(--primary)]/5 border-[var(--primary)]/30';

            return (
              <button
                key={q.id}
                type="button"
                onClick={() => {
                  setCurrentQuestionIdx(idx);
                  setSidebarOpen(false);
                }}
                className={`w-full text-left px-3 py-2 border border-transparent text-[13px] transition-all hover:border-[var(--border)] ${
                  idx === currentQuestionIdx ? 'border-[var(--primary)]/40 bg-[var(--primary)]/5' : ''
                } ${bgClass}`}
              >
                <div className="flex items-center gap-2">
                  <span className="meta-mono text-[11px] text-[var(--muted-foreground)] shrink-0">{idx + 1}.</span>
                  <span className="truncate">{q.title}</span>
                  {result?.isCorrect === true && (
                    <span className="meta-mono text-[10px] text-emerald-500 shrink-0 ml-auto">✓</span>
                  )}
                  {result?.isCorrect === false && (
                    <span className="meta-mono text-[10px] text-red-500 shrink-0 ml-auto">✗</span>
                  )}
                  {hasAnswer && !result && (
                    <span className="meta-mono text-[10px] text-[var(--primary)] shrink-0 ml-auto">●</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
