/**
 * @file 考试倒计时 — 取最近的 published 考试（end_time 最近），展示倒计时。
 * 未登录时降级为引导登录。
 */
'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AlarmClock } from 'lucide-react';
import { WorkbenchCard } from '../workbench-card';
import { useEffect, useState } from 'react';
import { apiRequest } from '@/shared/hooks/use-api-request';

interface ExamItem {
  id: string;
  title: string;
  endedAt: string | null;
}

function diffText(diffMs: number): { n: number; unit: 'daysLater' | 'hoursLater' | 'minutesLater' } {
  const ms = Math.max(0, diffMs);
  const days = Math.floor(ms / 86_400_000);
  if (days > 0) return { n: days, unit: 'daysLater' };
  const hours = Math.floor(ms / 3_600_000);
  if (hours > 0) return { n: hours, unit: 'hoursLater' };
  return { n: Math.max(1, Math.floor(ms / 60_000)), unit: 'minutesLater' };
}

export default function ExamCountdown() {
  const t = useTranslations('workbench');
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // 初始占位 0，挂载后再取真实时间，避免 SSR/CSR 时间戳不一致导致 hydration mismatch
  const [nowTs, setNowTs] = useState(() => 0);

  useEffect(() => {
    setNowTs(Date.now());
    const timer = setInterval(() => setNowTs(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const r = await apiRequest<{ exams: ExamItem[] }>(
        '/api/tools/exam?status=published&page=1&pageSize=20',
        { cache: 'no-store' },
      );
      if (cancelled) return;
      if (r.status === 401) {
        setNotLoggedIn(true);
      } else if (r.ok && r.data) {
        const nowTs = Date.now();
        const upcoming = (r.data.exams ?? [])
          .filter((e) => e.endedAt && new Date(e.endedAt).getTime() > nowTs)
          .sort(
            (a, b) =>
              new Date(a.endedAt as string).getTime() - new Date(b.endedAt as string).getTime(),
          )
          .slice(0, 3);
        setExams(upcoming);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <WorkbenchCard
      corner="EXM"
      title={
        <>
          <AlarmClock className="w-4 h-4" />
          {t('examCountdown')}
        </>
      }
      loading={!loaded}
      error={
        notLoggedIn ? (
          <div className="text-[13px] text-[var(--muted-foreground)]">
            <Link href="/login" className="text-[var(--primary)] underline underline-offset-2">
              {t('wbSubtitle')} →
            </Link>
          </div>
        ) : undefined
      }
      empty={!notLoggedIn && exams.length === 0 ? t('noExam') : false}
    >
      <ul className="flex flex-col gap-2.5">
        {exams.map((exam, i) => {
          const diff = exam.endedAt ? new Date(exam.endedAt).getTime() - nowTs : 0;
          const { n, unit } = diffText(diff);
          return (
            <li key={exam.id} className="flex items-baseline justify-between gap-3">
              {i === 0 ? (
                <span className="display-serif text-[clamp(28px,4vw,40px)] leading-none text-[var(--foreground)] tabular-nums">
                  {n}
                  <span className="text-[13px] text-[var(--muted-foreground)] ml-1.5">
                    {t(unit, { n })}
                  </span>
                </span>
              ) : (
                <span className="text-[13px] text-[var(--muted-foreground)]">
                  {n} {t(unit, { n })}
                </span>
              )}
              <span className="text-[12px] text-[var(--muted-foreground)] truncate max-w-[55%] text-right">
                {exam.title}
              </span>
            </li>
          );
        })}
      </ul>
    </WorkbenchCard>
  );
}
