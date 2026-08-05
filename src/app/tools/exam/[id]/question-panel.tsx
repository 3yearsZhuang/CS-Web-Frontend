'use client';

/**
 * @file QuestionPanel — 单题答题区（考试答题页子组件）
 *
 * 从 `app/tools/exam/[id]/page.tsx` 拆出（GENERAL 2.4「组件 > 500 行拆分」）。
 * 仅负责渲染；状态与逻辑由父页面注入的 `ExamState` 提供（GENERAL 2.2）。
 */

import { motion } from 'motion/react';
import { Button } from '@/components';
import type { ExamState } from './use-exam';

export function QuestionPanel(props: ExamState) {
  const {
    exam,
    questions,
    currentQuestion,
    currentQuestionIdx,
    answers,
    results,
    submitted,
    submitting,
    isLoggedIn,
    selectOption,
    setCodingAnswer,
    setCurrentQuestionIdx,
    handleSubmit,
    error,
  } = props;

  if (!currentQuestion) return null;

  return (
    <div className="p-6 lg:p-12 max-w-3xl">
      <motion.div
        key={currentQuestion.id}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center gap-3 mb-6">
          <span className="meta-mono text-[13px] text-[var(--muted-foreground)]">
            [{String(currentQuestionIdx + 1).padStart(2, '0')}]
          </span>
          <span className="meta-mono text-[11px] text-[var(--muted-foreground)]/60">
            {currentQuestion.type === 'single_choice' ? '选择题' : '编程题'}
          </span>
          <span className="meta-mono text-[11px] text-[var(--muted-foreground)]/60">{currentQuestion.score} 分</span>
        </div>

        <h2 className="text-xl font-semibold mb-4">{currentQuestion.title}</h2>

        {currentQuestion.contentMarkdown && (
          <div className="text-sm text-[var(--muted-foreground)] mb-6 whitespace-pre-wrap font-mono bg-[var(--border)]/20 p-4 border border-[var(--border)]">
            {currentQuestion.contentMarkdown}
          </div>
        )}

        {/* 选择题选项 */}
        {currentQuestion.type === 'single_choice' && currentQuestion.options && (
          <div className="space-y-2">
            {currentQuestion.options.map((opt) => {
              const isSelected = answers[currentQuestion.id] === opt.label;
              const result = results[currentQuestion.id];
              const isCorrectAnswer = result !== undefined && opt.isCorrect;
              const isWrongSelection = result !== undefined && isSelected && !opt.isCorrect;

              let optionClass = 'border-[var(--border)] hover:border-[var(--primary)]/40';
              if (submitted) {
                if (isCorrectAnswer) optionClass = 'border-emerald-500/40 bg-emerald-500/5';
                if (isWrongSelection) optionClass = 'border-red-500/40 bg-red-500/5';
              } else if (isSelected) {
                optionClass = 'border-[var(--primary)]/40 bg-[var(--primary)]/5';
              }

              return (
                <button
                  key={opt.id}
                  type="button"
                  disabled={submitted}
                  onClick={() => selectOption(currentQuestion.id, opt.label)}
                  className={`w-full text-left px-4 py-3 border transition-all ${optionClass} ${
                    submitted ? 'cursor-default' : 'cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="meta-mono text-[13px] w-6 h-6 flex items-center justify-center border border-[var(--border)] shrink-0">
                      {opt.label}
                    </span>
                    <span className="text-sm">{opt.content}</span>
                    {submitted && isCorrectAnswer && (
                      <span className="meta-mono text-[11px] text-emerald-500 ml-auto shrink-0">✓ 正确</span>
                    )}
                    {submitted && isWrongSelection && (
                      <span className="meta-mono text-[11px] text-red-500 ml-auto shrink-0">✗ 错误</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* 编程题 */}
        {currentQuestion.type === 'coding' && (
          <div>
            <textarea
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => setCodingAnswer(currentQuestion.id, e.target.value)}
              disabled={submitted}
              placeholder="在此输入你的代码..."
              className="w-full h-48 bg-[var(--background)] border border-[var(--border)] p-4 font-mono text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 resize-none focus:outline-none focus:border-[var(--primary)]/40 transition-colors"
            />
            {submitted && results[currentQuestion.id]?.score !== null && (
              <div className="mt-3 meta-mono text-[13px] text-[var(--primary)]">
                得分: {results[currentQuestion.id]?.score} / {currentQuestion.score}
              </div>
            )}
            {submitted && results[currentQuestion.id]?.score === null && (
              <div className="mt-3 meta-mono text-[13px] text-[var(--muted-foreground)]">待批改</div>
            )}
          </div>
        )}

        {/* 导航 */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--border)]">
          <Button
            variant="outline"
            type="button"
            disabled={currentQuestionIdx === 0}
            onClick={() => setCurrentQuestionIdx((i) => i - 1)}
            className="text-sm"
          >
            ← 上一题
          </Button>

          <span className="meta-mono text-[11px] text-[var(--muted-foreground)]">
            {currentQuestionIdx + 1} / {questions.length}
          </span>

          {currentQuestionIdx < questions.length - 1 ? (
            <Button
              variant="outline"
              type="button"
              onClick={() => setCurrentQuestionIdx((i) => i + 1)}
              className="text-sm"
            >
              下一题 →
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || submitted}
              className="text-sm"
            >
              {submitting ? '提交中...' : submitted ? '已提交' : isLoggedIn ? '提交答案' : '登录后提交'}
            </Button>
          )}
        </div>

        {error && <div className="mt-4 text-sm text-red-500">{error}</div>}
      </motion.div>
    </div>
  );
}
