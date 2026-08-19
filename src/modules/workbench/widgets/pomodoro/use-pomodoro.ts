/**
 * @file use-pomodoro — 番茄钟计时状态机 + 阶段声音联动（逻辑层，与 UI 解耦）。
 * - 计时用「目标时间戳差值」实现，免疫 tab 休眠漂移，刷新页面不丢进度
 * - 阶段自动切音：专注→专注音，短休→休息音，长休→放松音（可配置）
 * - 音源：WebAudio 合成环境音（ambientEngine）或 IndexedDB 上传音乐
 */
'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { ambientEngine, type AmbientKind } from '../../lib/ambient-audio';
import { useIdbMedia } from '../../hooks/use-idb-media';
import { useLocalStorage } from '../../hooks/use-local-storage';
import type { PomodoroPhase, PomodoroSettings, PomodoroState, SoundSource } from '../../types';
import { DEFAULT_SETTINGS } from './constants';
import { apiRequest } from '@/shared/hooks/use-api-request';

const DEFAULT_STATE: PomodoroState = {
  phase: 'idle',
  running: false,
  endAt: null,
  round: 0,
  finishedAt: null,
};

export function usePomodoro(audioRef: RefObject<HTMLAudioElement | null>) {
  const [settings, setSettings] = useLocalStorage<PomodoroSettings>(
    'wb_pomodoro_settings',
    DEFAULT_SETTINGS,
  );
  const [state, setState] = useLocalStorage<PomodoroState>('wb_pomodoro_state', DEFAULT_STATE);
  // 初始占位 0，挂载后再取真实时间，避免 SSR/CSR 时间戳不一致导致 hydration mismatch
  const [now, setNow] = useState(() => 0);
  const [currentSound, setCurrentSound] = useState<SoundSource | null>(null);

  const musicUrlRef = useRef<string | null>(null);
  const { items: musicItems, upload, remove, getObjectUrl } = useIdbMedia();

  const phaseDurationMs = useMemo(() => {
    const min =
      state.phase === 'shortBreak'
        ? settings.shortBreakMin
        : state.phase === 'longBreak'
          ? settings.longBreakMin
          : settings.focusMin;
    return min * 60_000;
  }, [state.phase, settings]);

  const ambientKindOf = useCallback((s: SoundSource): AmbientKind | null => {
    if (s === 'rain' || s === 'waves' || s === 'fire' || s === 'white') return s;
    return null;
  }, []);

  /** 停掉一切声音，再按 source 播放 */
  const playSound = useCallback(
    async (source: SoundSource) => {
      ambientEngine.stop();
      if (musicUrlRef.current) {
        URL.revokeObjectURL(musicUrlRef.current);
        musicUrlRef.current = null;
      }
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.removeAttribute('src');
      }
      setCurrentSound(source);
      if (source === 'silence') return;
      const kind = ambientKindOf(source);
      if (kind) {
        ambientEngine.play(kind);
        return;
      }
      if (source.startsWith('upload:')) {
        const id = source.slice(7);
        const rec = await getObjectUrl(id);
        if (rec && audio) {
          musicUrlRef.current = rec.url;
          audio.src = rec.url;
          audio.loop = true;
          audio.volume = 0.7;
          void audio.play().catch(() => {});
        }
      }
    },
    [ambientKindOf, getObjectUrl, audioRef],
  );

  /** 按阶段应用配置的声音 */
  const applyPhaseSound = useCallback(
    (phase: PomodoroPhase) => {
      const source =
        phase === 'focus'
          ? settings.focusSound
          : phase === 'shortBreak'
            ? settings.breakSound
            : settings.longBreakSound;
      void playSound(source);
    },
    [settings, playSound],
  );

  /** 阶段推进（含到期自动流转） */
  const completePhase = useCallback(() => {
    ambientEngine.beep();
    const durMs = (phase: PomodoroPhase) =>
      (phase === 'shortBreak'
        ? settings.shortBreakMin
        : phase === 'longBreak'
          ? settings.longBreakMin
          : settings.focusMin) * 60_000;

    setState((prev) => {
      const next: PomodoroState = { ...prev };
      if (prev.phase === 'focus') {
        next.round = prev.round + 1;
        next.phase =
          next.round % settings.roundsBeforeLong === 0 ? 'longBreak' : 'shortBreak';
      } else {
        next.phase = 'focus';
      }
      next.running = true;
      next.endAt = Date.now() + durMs(next.phase);
      next.finishedAt = null;
      return next;
    });
    // 声音在下一 effect 中随 phase 变化应用
  }, [settings, setState]);

  /** 倒计时主循环 + 到期检测 */
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!state.running || state.endAt == null) return;
    if (now >= state.endAt) {
      completePhase();
    }
  }, [now, state, completePhase]);

  /** 完成一轮专注（round 递增）时上报后端落库；未登录/失败静默，不影响本地体验 */
  const prevRoundRef = useRef(state.round);
  useEffect(() => {
    if (state.round > prevRoundRef.current) {
      void apiRequest('/api/workbench/focus-sessions', {
        method: 'POST',
        body: {
          durationSeconds: settings.focusMin * 60,
          phase: 'focus',
          soundSource: settings.focusSound,
        },
      });
    }
    prevRoundRef.current = state.round;
  }, [state.round, settings.focusMin, settings.focusSound]);

  /** phase 变化时应用对应声音 */
  const prevPhaseRef = useRef(state.phase);
  useEffect(() => {
    if (prevPhaseRef.current !== state.phase) {
      prevPhaseRef.current = state.phase;
      if (state.phase !== 'idle') applyPhaseSound(state.phase);
    }
  }, [state.phase, applyPhaseSound]);

  const remaining =
    state.running && state.endAt != null
      ? Math.max(0, state.endAt - now)
      : state.phase === 'idle'
        ? phaseDurationMs
        : (state.finishedAt ?? phaseDurationMs);
  const progress =
    phaseDurationMs > 0 ? Math.min(1, Math.max(0, 1 - remaining / phaseDurationMs)) : 0;

  const start = useCallback(() => {
    ambientEngine.ensureCtx();
    setState((prev) => ({
      ...prev,
      phase: prev.phase === 'idle' ? 'focus' : prev.phase,
      running: true,
      endAt: Date.now() + phaseDurationMs,
      finishedAt: null,
    }));
    applyPhaseSound(state.phase === 'idle' ? 'focus' : state.phase);
  }, [phaseDurationMs, setState, applyPhaseSound, state.phase]);

  const pause = useCallback(() => {
    setState((prev) => ({
      ...prev,
      running: false,
      finishedAt: prev.endAt != null ? Math.max(0, prev.endAt - Date.now()) : phaseDurationMs,
    }));
  }, [phaseDurationMs, setState]);

  const resume = useCallback(() => {
    ambientEngine.ensureCtx();
    setState((prev) => ({
      ...prev,
      running: true,
      endAt: Date.now() + (prev.finishedAt ?? phaseDurationMs),
      finishedAt: null,
    }));
  }, [phaseDurationMs, setState]);

  const reset = useCallback(() => {
    ambientEngine.stop();
    if (musicUrlRef.current) {
      URL.revokeObjectURL(musicUrlRef.current);
      musicUrlRef.current = null;
    }
    const audio = audioRef.current;
    if (audio) audio.pause();
    setCurrentSound(null);
    setState({ ...DEFAULT_STATE });
  }, [setState, audioRef]);

  /** 音源下拉选择：更新配置，若当前阶段匹配则立即应用 */
  const changePhaseSound = useCallback(
    (phaseKey: 'focusSound' | 'breakSound' | 'longBreakSound', source: SoundSource) => {
      setSettings((prev) => ({ ...prev, [phaseKey]: source }));
      if (
        (phaseKey === 'focusSound' && state.phase === 'focus') ||
        (phaseKey === 'breakSound' && state.phase === 'shortBreak') ||
        (phaseKey === 'longBreakSound' && state.phase === 'longBreak')
      ) {
        void playSound(source);
      }
    },
    [setSettings, state.phase, playSound],
  );

  return {
    settings,
    setSettings,
    state,
    currentSound,
    remaining,
    progress,
    musicItems,
    upload,
    remove,
    playSound,
    changePhaseSound,
    start,
    pause,
    resume,
    reset,
  };
}
