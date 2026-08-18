/**
 * @file 番茄钟 × 音乐播放器组合层（目录即模块：use-pomodoro + settings/music 面板）。
 * - 计时状态机 / 声音联动在 use-pomodoro hook，UI 只负责渲染
 * - 主操作按钮复用项目 Button（等宽大写风格），阶段色用 Tailwind 语义色板
 */
'use client';

import { useTranslations } from 'next-intl';
import { ChevronDown, Music2, Pause, Play, RotateCcw } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/primitives/button';
import { DnaCard } from '@/components';
import { MusicPanel } from './music-panel';
import { SettingsPanel } from './settings-panel';
import { usePomodoro } from './use-pomodoro';
import { fmt, PHASE_COLOR_CLASS, PHASE_RING_STROKE } from './constants';

const RING_R = 52;
const RING_CIRC = 2 * Math.PI * RING_R;

export function PomodoroPlayer() {
  const t = useTranslations('workbench');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pomo = usePomodoro(audioRef);
  const [showConfig, setShowConfig] = useState(false);
  const [showMusic, setShowMusic] = useState(false);

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

  const playUploaded = (id: string) => {
    void pomo.playSound(`upload:${id}`);
    setShowMusic(false);
  };

  return (
    <DnaCard corner="FCS" className="p-5 flex flex-col gap-4">
      <audio ref={audioRef} className="hidden" />

      <div className="flex items-center justify-between">
        <h3 className="meta-mono text-[11px] uppercase tracking-wider text-[var(--muted-foreground)]">
          {t('pomodoro')}
        </h3>
        <div className="flex items-center gap-2">
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full border ${phaseClass}`}
          >
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
        </div>
      </div>

      <div className="flex items-center justify-center gap-6">
        <div className="relative w-[128px] h-[128px] shrink-0">
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

      {/* 迷你播放条：当前音源 */}
      <div className="flex items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
        <div className="flex items-center gap-2 min-w-0">
          <Music2 className="w-4 h-4 shrink-0 text-[var(--muted-foreground)]" />
          <span className="text-[12px] text-[var(--muted-foreground)] truncate">
            {pomo.currentSound
              ? pomo.currentSound.startsWith('upload:')
                ? t('myMusic')
                : pomo.currentSound === 'silence'
                  ? t('silence')
                  : (t(
                      (
                        [
                          ['rain', 'soundRain'],
                          ['waves', 'soundWaves'],
                          ['fire', 'soundFire'],
                          ['white', 'soundWhite'],
                        ] as const
                      ).find(([v]) => v === pomo.currentSound)?.[1] as Parameters<typeof t>[0],
                    ) ?? pomo.currentSound)
              : '—'}
          </span>
        </div>
        <button
          type="button"
          aria-label="music list"
          className="p-2 rounded hover:bg-[var(--border)]"
          onClick={() => setShowMusic((v) => !v)}
        >
          <Music2 className="w-4 h-4" />
        </button>
      </div>

      {showMusic && (
        <MusicPanel
          musicItems={pomo.musicItems}
          currentSound={pomo.currentSound}
          onPlay={playUploaded}
          onUpload={(file) => {
            if (file) void pomo.upload(file).then((id) => playUploaded(id));
          }}
          onRemove={(id) => void pomo.remove(id)}
        />
      )}

      {showConfig && (
        <SettingsPanel
          settings={pomo.settings}
          musicItems={pomo.musicItems}
          onChangeDuration={(key, value) =>
            pomo.setSettings((prev) => ({ ...prev, [key]: value }))
          }
          onChangeSound={pomo.changePhaseSound}
        />
      )}
    </DnaCard>
  );
}
