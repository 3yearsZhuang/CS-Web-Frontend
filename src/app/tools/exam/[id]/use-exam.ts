'use client';

/**
 * @file useExam — 考试答题页共享状态与逻辑 Hook
 *
 * 从 `app/tools/exam/[id]/page.tsx` 拆出，遵循 GENERAL 2.2「展示与容器分离」、
 * 2.4「逻辑 > 150 行提为 Hook / 组件 > 500 行拆分」。各渲染子组件复用本 Hook 返回值。
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/shared/hooks/use-api-request';

export interface ExamDetail {
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

export interface ExamQuestion {
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

export interface ExamOption {
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

export function useExam(id: string) {
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
        const result = await apiRequest<{ exam: ExamDetail; questions?: ExamQuestion[] }>(
          `/api/tools/exam/${id}`,
        );
        if (!result.ok) throw new Error(result.error ?? '加载失败');
        const data = result.data!;
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
    return () => {
      cancelled = true;
    };
  }, [id]);

  // 检查登录状态 + 加载之前的答题记录
  useEffect(() => {
    let cancelled = false;
    async function checkAuth() {
      try {
        const me = await apiRequest<{ user: { id: string; role: string } }>('/api/auth/me');
        if (!me.ok) return;
        const data = me.data!;
        if (cancelled) return;
        if (data.user) {
          setIsLoggedIn(true);
          const attemptsResult = await apiRequest<{ attempts?: PreviousAttempt[] }>(
            `/api/tools/exam/${id}/my-results`,
          );
          if (attemptsResult.ok) {
            const attemptsData = attemptsResult.data!;
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
    return () => {
      cancelled = true;
    };
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

  const setCodingAnswer = useCallback(
    (questionId: string, value: string) => {
      if (submitted) return;
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
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

      const result = await apiRequest<{ results: AttemptResult[] }>(
        `/api/tools/exam/${id}/submit`,
        { method: 'POST', body: { answers: answerList } },
      );

      if (!result.ok) {
        throw new Error(result.error ?? '提交失败');
      }

      const data = result.data!;
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
  const totalScore = useMemo(() => Object.values(results).reduce((sum, r) => sum + (r.score ?? 0), 0), [results]);
  const maxScore = useMemo(() => questions.reduce((sum, q) => sum + q.score, 0), [questions]);
  const correctCount = useMemo(() => Object.values(results).filter((r) => r.isCorrect).length, [results]);

  return {
    router,
    id,
    exam,
    questions,
    answers,
    results,
    loading,
    submitting,
    submitted,
    error,
    setError,
    currentQuestionIdx,
    setCurrentQuestionIdx,
    sidebarOpen,
    setSidebarOpen,
    timeRemaining,
    isLoggedIn,
    selectOption,
    setCodingAnswer,
    handleSubmit,
    formatTime,
    currentQuestion,
    totalScore,
    maxScore,
    correctCount,
  };
}

export type ExamState = ReturnType<typeof useExam>;
