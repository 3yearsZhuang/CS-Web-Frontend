/**
 * @file 时间问候条 — 当前时间/日期/本次会话在线时长（工作台顶部全宽模块）
 * 已针对像素融合方案进行重构，移除原有操作按钮，回归极简信息展示。
 */
'use client';

import { useTranslations } from 'next-intl';
import { DnaCard } from '@/components';
import { formatClock, formatDateZh, greetingKey, useClock } from '../hooks/use-clock';

export default function GreetingBar() {
  const t = useTranslations('workbench');
  const { now, sessionDuration, mounted } = useClock();

  return (
    <DnaCard corner="HI" className="px-6 py-5 flex flex-wrap items-center gap-5 h-full min-h-0 overflow-hidden">
      <span className="display-serif text-[clamp(22px,3vw,32px)] text-[var(--foreground)]">
        {t(greetingKey(now.getHours()))}
      </span>
      <span className="hidden sm:block w-px h-6 bg-[var(--border)]" />
      <span className="meta-mono">{mounted ? formatDateZh(now) : ''}</span>
      <span className="meta-mono">{mounted ? formatClock(now) : '--:--:--'}</span>
      <span className="meta-mono">{t('onlineLabel')} {mounted ? sessionDuration : ''}</span>
    </DnaCard>
  );
}
