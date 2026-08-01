/**
 * @file 考试答题页（/tools/exam/[id]）— 题目列表侧边栏 + 答题区 + 计时器 + 自动判分
 */
'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import Link from 'next/link';
import { Button } from '@/components';

interface ExamDetail {
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

interface ExamQuestion {
  id: string;
  examId: string;
  type: 'single_choice' | 'coding';
  title: string;
  contentMarkdown: string | null;
  score: number;
  sortOrder: number;
  createdAt: string;
  options?: ExamOption[];
}

interface ExamOption {
  id: string;
  questionId: string;
  label: string;
  content: string;
  isCorrect: boolean;
  sortOrder: number;
}

interface AttemptResult {
  questionId: string;
  isCorrect: boolean | null;
  score: number | null;
}

interface PreviousAttempt {
  id: string;
  userId: string;
  examId: string;
  questionId: string;
  answer: string | null;
  isCorrect: boolean | null;
  score: number | null;
  submittedAt: string;
}

export default function ExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [exam, setExam] = useState<ExamDetail | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, AttemptResult>>({});
  const [previousAttempts, setPreviousAttempts] = useState<PreviousAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // 加载考试和题目
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/tools/exam/${id}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || '加载失败');
        }
        const data = await res.json();
        if (cancelled) return;
        setExam(data.exam);
        setQuestions(data.questions || []);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : '加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  // 检查登录状态 + 加载之前的答题记录
  useEffect(() => {
    let cancelled = false;
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        if (data.user) {
          setIsLoggedIn(true);
          // 加载之前的答题记录
          const attemptsRes = await fetch(`/api/tools/exam/${id}/my-results`);
          if (attemptsRes.ok) {
            const attemptsData = await attemptsRes.json();
            if (cancelled) return;
            const attempts: PreviousAttempt[] = attemptsData.attempts || [];
            setPreviousAttempts(attempts);
            const prevAnswers: Record<string, string> = {};
            const prevResults: Record<string, AttemptResult> = {};
            for (const a of attempts) {
              if (a.answer) prevAnswers[a.questionId] = a.answer;
              prevResults[a.questionId] = {
                questionId: a.questionId,
                isCorrect: a.isCorrect,
                score: a.score,
              };
            }
            setAnswers(prevAnswers);
            setResults(prevResults);
            if (attempts.length > 0) setSubmitted(true);
          }
        }
      } catch {
        // ignore
      }
    }
    checkAuth();
    return () => { cancelled = true; };
  }, [id]);

  // 计时器
  useEffect(() => {
    if (!exam || !exam.endTime || exam.status !== 'published') return;

    const updateTimer = () => {
      const now = new Date();
      const end = new Date(exam.endTime!);
      const remaining = Math.max(0, Math.floor((end.getTime() - now.getTime()) / 1000));
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [exam]);

  const selectOption = useCallback(
    (questionId: string, label: string) => {
      if (submitted) return;
      setAnswers((prev) => ({ ...prev, [questionId]: label }));
    },
    [submitted],
  );

  const handleSubmit = useCallback(async () => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=/tools/exam/${id}`);
      return;
    }
    if (submitting) return;

    const unanswered = questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      setError(`还有 ${unanswered.length} 道题未作答`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const answerList = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));

      const res = await fetch(`/api/tools/exam/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answerList }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || '提交失败');
      }

      const data = await res.json();
      const newResults: Record<string, AttemptResult> = {};
      for (const r of data.results) {
        newResults[r.questionId] = r;
      }
      setResults((prev) => ({ ...prev, ...newResults }));
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交失败');
    } finally {
      setSubmitting(false);
    }
  }, [isLoggedIn, submitting, answers, questions, id, router]);

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentQuestionIdx];
  const totalScore = useMemo(() => {
    return Object.values(results).reduce((sum, r) => sum + (r.score ?? 0), 0);
  }, [results]);
  const maxScore = useMemo(() => questions.reduce((sum, q) => sum + q.score, 0), [questions]);
  const correctCount = useMemo(() => Object.values(results).filter((r) => r.isCorrect).length, [results]);

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

  if (error && !exam) {
    return (
      <main className="relative pt-16">
        <div className="max-w-[1600px] mx-auto px-6 py-24 text-center">
          <div className="meta-mono text-[var(--muted-foreground)] mb-4">[ ERROR ]</div>
          <h1 className="display-serif text-4xl mb-4">{error}</h1>
          <Button variant="outline" onClick={() => router.push('/tools/exam')}>
            返回考试列表
          </Button>
        </div>
      </main>
    );
  }

  if (!exam) return null;

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
              ← 返回
            </Link>
            <h1 className="text-lg font-semibold truncate">{exam.title}</h1>
            {timeRemaining !== null && (
              <span className={`meta-mono text-[13px] shrink-0 ${timeRemaining < 300 ? 'text-red-500' : 'text-[var(--muted-foreground)]'}`}>
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
                {sidebarOpen ? '关闭题目列表' : `题目 ${currentQuestionIdx + 1}/${questions.length}`}
              </button>
            )}
            {submitted && (
              <div className="meta-mono text-[13px] text-[var(--primary)]">
                {correctCount}/{questions.length} 正确 · {totalScore}/{maxScore} 分
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto flex">
        {/* 题目列表侧边栏 */}
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
              ✕ 关闭
            </button>
          )}
          <div className="p-4">
            <div className="meta-mono text-[11px] text-[var(--muted-foreground)] mb-4">
              题目列表 ({questions.length})
            </div>
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
                      <span className="meta-mono text-[11px] text-[var(--muted-foreground)] shrink-0">
                        {idx + 1}.
                      </span>
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

        {/* 答题区域 */}
        <div className="flex-1 min-w-0">
          {currentQuestion && (
            <div className="p-6 lg:p-12 max-w-3xl">
              {/* 题目 */}
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
                  <span className="meta-mono text-[11px] text-[var(--muted-foreground)]/60">
                    {currentQuestion.score} 分
                  </span>
                </div>

                <h2 className="text-xl font-semibold mb-4">{currentQuestion.title}</h2>

                {currentQuestion.contentMarkdown && (
                  <div className="text-sm text-[var(--muted-foreground)] mb-6 whitespace-pre-wrap font-mono bg-[var(--border)]/20 p-4 border border-[var(--border)]">
                    {currentQuestion.contentMarkdown}
                  </div>
                )}

                {/* 选项 */}
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
                      onChange={(e) => {
                        if (submitted) return;
                        setAnswers((prev) => ({ ...prev, [currentQuestion.id]: e.target.value }));
                      }}
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
                      <div className="mt-3 meta-mono text-[13px] text-[var(--muted-foreground)]">
                        待批改
                      </div>
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

                {error && (
                  <div className="mt-4 text-sm text-red-500">{error}</div>
                )}
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}