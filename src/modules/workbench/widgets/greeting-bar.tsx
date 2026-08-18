/**
 * @file 时间问候条 — 当前时间/日期/本次会话在线时长（工作台顶部全宽模块）
 * 同时聚合工作台操作入口：导出备份 / 导入恢复 / 清空 / 布局设置
 */
'use client';

import { useTranslations } from 'next-intl';
import { Clock3, Download, RefreshCw, Settings2, Timer, Trash2 } from 'lucide-react';
import { useRef } from 'react';
import { DnaCard } from '@/components';
import { formatClock, formatDateZh, greetingKey, useClock } from '../hooks/use-clock';

interface GreetingBarProps {
  onExport?: () => void;
  onImport?: (file: File | null) => void;
  onClear?: () => void;
  onOpenLayout?: () => void;
}

export default function GreetingBar({ onExport, onImport, onClear, onOpenLayout }: GreetingBarProps) {
  const t = useTranslations('workbench');
  const { now, sessionDuration, mounted } = useClock();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const iconBtn =
    'inline-flex items-center gap-1 px-2 py-1 rounded border border-[var(--border)] text-[12px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--border)]/40 transition-colors';

  return (
    <DnaCard corner="HI" className="px-5 py-4 flex flex-col justify-between gap-3 h-full min-h-0 overflow-hidden">
      <div className="flex items-center gap-3">
        <span className="display-serif text-[clamp(20px,3vw,30px)] text-[var(--foreground)]">
          {t(greetingKey(now.getHours()))}
        </span>
        <span className="hidden sm:block w-px h-5 bg-[var(--border)]" />
        <span className="text-[13px] text-[var(--muted-foreground)]">
          {mounted ? formatDateZh(now) : ''}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 tabular-nums text-[14px] text-[var(--foreground)]">
            <Clock3 className="w-4 h-4 text-[var(--muted-foreground)]" />
            {mounted ? formatClock(now) : '--:--:--'}
          </span>
          <span className="flex items-center gap-1.5 text-[13px] text-[var(--muted-foreground)]">
            <Timer className="w-4 h-4" />
            {t('onlineLabel')} {mounted ? sessionDuration : ''}
          </span>
        </div>
        {mounted && (
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" className={iconBtn} onClick={onExport}>
              <Download className="w-3.5 h-3.5" />
              导出
            </button>
            <button type="button" className={iconBtn} onClick={() => fileRef.current?.click()}>
              <RefreshCw className="w-3.5 h-3.5" />
              导入
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => onImport?.(e.target.files?.[0] ?? null)}
            />
            <button type="button" className={`${iconBtn} hover:text-[var(--danger)]`} onClick={onClear}>
              <Trash2 className="w-3.5 h-3.5" />
              清空
            </button>
            <button type="button" className={iconBtn} onClick={onOpenLayout}>
              <Settings2 className="w-3.5 h-3.5" />
              布局
            </button>
          </div>
        )}
      </div>
    </DnaCard>
  );
}
