/**
 * @file 番茄钟播放器（目录即模块：use-pomodoro 状态机 + settings 面板）。
 * - 计时状态机 / 阶段环境音联动在 use-pomodoro hook，UI 只负责渲染
 * - 音乐播放已独立为 workbench 的 music widget，二者经 audioBus 互斥抢占
 * - 主操作按钮复用项目 Button（等宽大写风格），阶段色用 Tailwind 语义色板
 */
'use client';

import { useTranslations } from 'next-intl';
import { ChevronDown, Pause, Play, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/primitives/button';
import { WorkbenchCard } from '../../workbench-card';
import { SettingsPanel } from './settings-panel';
import { usePomodoro } from './use-pomodoro';
import { fmt, PHASE_COLOR_CLASS, PHASE_RING_STROKE } from './constants';

const RING_R = 52;
const RING_CIRC = 2 * Math.PI * RING_R;

export function PomodoroPlayer() {
  const t = useTranslations('workbench');
  const pomo = usePomodoro();
  const [showConfig, setShowConfig] = useState(false);

  const phaseLabel =
    pomo.state.phase === 'focus'
      ? t('focusPhase')
      : pomo.state.phase === 'shortBreak'
        ? t('shortBreakPhase')
        : pomo.state.phase === 'longBreak'
          ? t('longBreakPhase')
          : t('pomodoro');

  const ringColor = PHASE_RING_STROKE[pomo.state.phase];
  const phaseClass = PHASE_COLOR_CLASS[pomo.state.phase];

  return (
    <WorkbenchCard
      corner="FCS"
      title={t('pomodoro')}
      actions={
        <>
          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${phaseClass}`}>
            {phaseLabel}
            {pomo.state.round > 0 && ` · ${t('roundN', { n: pomo.state.round })}`}
          </span>
          <button
            type="button"
            aria-label="settings"
            className="p-2 rounded hover:bg-[var(--border)]"
            onClick={() => setShowConfig((v) => !v)}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showConfig ? 'rotate-180' : ''}`}
            />
          </button>
        </>
      }
    >
      <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 overflow-y-auto">
        <div className="relative w-[clamp(88px,60%,128px)] aspect-square shrink-0">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r={RING_R} fill="none" stroke="var(--border)" strokeWidth="6" />
            <circle
              cx="60"
              cy="60"
              r={RING_R}
              fill="none"
              stroke={ringColor}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={RING_CIRC}
              strokeDashoffset={RING_CIRC * (1 - pomo.progress)}
              className="transition-[stroke-dashoffset] duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[28px] font-medium tabular-nums leading-none text-[var(--foreground)]">
              {fmt(pomo.remaining)}
            </span>
            <span className="text-[11px] text-[var(--muted-foreground)] mt-1">
              {pomo.state.phase === 'idle' ? `${pomo.settings.focusMin}min` : phaseLabel}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {!pomo.state.running ? (
            <Button
              size="sm"
              variant="pixel"
              onClick={pomo.state.phase === 'idle' || pomo.state.finishedAt == null ? pomo.start : pomo.resume}
            >
              <Play className="w-4 h-4" />
              {pomo.state.phase === 'idle' ? t('startFocus') : t('resume')}
            </Button>
          ) : (
            <Button size="sm" variant="pixel-outline" onClick={pomo.pause}>
              <Pause className="w-4 h-4" />
              {t('pause')}
            </Button>
          )}
          <Button size="sm" variant="pixel-outline" onClick={pomo.reset}>
            <RotateCcw className="w-4 h-4" />
            {t('reset')}
          </Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {showConfig && (
          <SettingsPanel
            settings={pomo.settings}
            onChangeDuration={(key, value) =>
              pomo.setSettings((prev) => ({ ...prev, [key]: value }))
            }
            onChangeSound={pomo.changePhaseSound}
          />
        )}
      </div>
    </WorkbenchCard>
  );
}