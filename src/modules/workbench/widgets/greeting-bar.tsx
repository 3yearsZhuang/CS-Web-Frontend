/**
 * @file 时间问候条 — 当前时间/日期/本次会话在线时长（工作台顶部全宽模块）
 */
'use client';

import { useTranslations } from 'next-intl';
import { Clock3, Timer } from 'lucide-react';
import { DnaCard } from '@/components';
import { formatClock, formatDateZh, greetingKey, useClock } from '../hooks/use-clock';

export default function GreetingBar() {
  const t = useTranslations('workbench');
  const { now, sessionDuration } = useClock();

  return (
    <DnaCard corner="HI" className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="display-serif text-[clamp(20px,3vw,30px)] text-[var(--foreground)]">
          {t(greetingKey(now.getHours()))}
        </span>
        <span className="hidden sm:block w-px h-5 bg-[var(--border)]" />
        <span className="text-[13px] text-[var(--muted-foreground)]">{formatDateZh(now)}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 tabular-nums text-[14px] text-[var(--foreground)]">
          <Clock3 className="w-4 h-4 text-[var(--muted-foreground)]" />
          {formatClock(now)}
        </span>
        <span className="flex items-center gap-1.5 text-[13px] text-[var(--muted-foreground)]">
          <Timer className="w-4 h-4" />
          {t('onlineLabel')} {sessionDuration}
        </span>
      </div>
    </DnaCard>
  );
}
