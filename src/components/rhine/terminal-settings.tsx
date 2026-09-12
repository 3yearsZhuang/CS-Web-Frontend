'use client';

/**
 * @file TerminalSettings — Rhine 终端设置（FrontDoc-UID §17 作用域内使用）
 *
 * 设置项：减少动态效果（自动 / 开启 / 关闭）、界面音效、3D 画质、全屏、重播开场。
 * 持久化于 localStorage（`fztbu-rhine-terminal-settings`），并通过自定义事件
 * 在同一页面的多个订阅者之间同步（档案柜 / 终端开场 / 3D 终端共用）。
 *
 * 音效与画质当前由方案 B（3D 终端）消费；面板先落地并持久化，避免后续再改数据结构。
 */
import { useCallback, useEffect, useState } from 'react';

/** 设置键（localStorage） */
export const SETTINGS_KEY = 'fztbu-rhine-terminal-settings';
/** 同页同步事件名 */
export const SETTINGS_EVENT = 'fztbu-rhine-settings-change';

/** 减少动态效果：auto = 跟随系统 prefers-reduced-motion */
export type ReduceMotionMode = 'auto' | 'on' | 'off';
/** 3D 画质档位（对齐上游 render-quality） */
export type QualityLevel = 'high' | 'medium' | 'low';

/** 终端设置 */
export interface TerminalSettings {
  reduceMotion: ReduceMotionMode;
  sound: boolean;
  quality: QualityLevel;
}

/** 默认设置 */
export const DEFAULT_SETTINGS: TerminalSettings = {
  reduceMotion: 'auto',
  sound: false,
  quality: 'high',
};

/** 读取设置（SSR 安全：无 window 时返回默认） */
export function readSettings(): TerminalSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<TerminalSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** 写入设置并广播同页同步事件 */
export function writeSettings(next: TerminalSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  } catch {
    /* 存储不可用仅在内存生效 */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<TerminalSettings>(SETTINGS_EVENT, { detail: next }));
  }
}

/** 订阅设置（含跨组件同步） */
export function useTerminalSettings(): {
  settings: TerminalSettings;
  update: (patch: Partial<TerminalSettings>) => void;
} {
  const [settings, setSettings] = useState<TerminalSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    setSettings(readSettings());
    const onSync = (e: Event) => {
      const detail = (e as CustomEvent<TerminalSettings>).detail;
      if (detail) setSettings(detail);
    };
    window.addEventListener(SETTINGS_EVENT, onSync);
    return () => window.removeEventListener(SETTINGS_EVENT, onSync);
  }, []);

  const update = useCallback((patch: Partial<TerminalSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      writeSettings(next);
      return next;
    });
  }, []);

  return { settings, update };
}

/** 动效偏好：系统偏好 + 终端设置合并（true = 减少动态效果） */
export function useMotionPreference(): boolean {
  const { settings } = useTerminalSettings();
  const [systemReduce, setSystemReduce] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setSystemReduce(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setSystemReduce(e.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  if (settings.reduceMotion === 'on') return true;
  if (settings.reduceMotion === 'off') return false;
  return systemReduce;
}

/** 设置面板 Props */
export interface TerminalSettingsPanelProps {
  /** 是否打开 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 重播开场（由宿主注入：清会话标记并回到 BootSequence） */
  onReplay?: () => void;
}

const QUALITY_LABEL: Record<QualityLevel, string> = { high: 'HIGH', medium: 'MEDIUM', low: 'LOW' };

/** 终端设置面板（Rhine 作用域样式） */
export function TerminalSettingsPanel({ open, onClose, onReplay }: TerminalSettingsPanelProps) {
  const { settings, update } = useTerminalSettings();

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  }, []);

  return (
    <div
      className={`rhine-ov${open ? ' on' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="终端设置"
      aria-hidden={!open}
    >
      <div className="rhine-ov-head">
        <button type="button" className="rhine-back" onClick={onClose} tabIndex={open ? 0 : -1}>
          ← BACK / ESC
        </button>
        <span className="text-[10px] tracking-[0.18em]" style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}>
          SETTINGS // 终端设置
        </span>
      </div>
      <div className="mx-auto w-[min(680px,92vw)] overflow-y-auto py-8">
        <div className="rhine-kicker mb-6">显示与偏好</div>

        {/* 减少动态效果 */}
        <SettingRow
          label="减少动态效果"
          hint="关闭后仍可由系统偏好接管；开启时终端动效、编号滚动与标题快切全部降级"
        >
          <div className="flex gap-1.5">
            {(['auto', 'off', 'on'] as ReduceMotionMode[]).map((m) => (
              <button
                key={m}
                type="button"
                className="rhine-choice"
                aria-pressed={settings.reduceMotion === m}
                onClick={() => update({ reduceMotion: m })}
                tabIndex={open ? 0 : -1}
              >
                {m === 'auto' ? '自动' : m === 'off' ? '关闭' : '开启'}
              </button>
            ))}
          </div>
        </SettingRow>

        {/* 界面音效（方案 B 接线） */}
        <SettingRow label="界面音效" hint="方案 B（3D 终端）接线后生效；当前默认关闭">
          <Toggle
            checked={settings.sound}
            onChange={(v) => update({ sound: v })}
            tabIndex={open ? 0 : -1}
            labelOn="ON"
            labelOff="OFF"
          />
        </SettingRow>

        {/* 画质 */}
        <SettingRow label="3D 画质" hint="影响透射强度、像素比与阵列行数（方案 B 启用后生效）">
          <div className="flex gap-1.5">
            {(['high', 'medium', 'low'] as QualityLevel[]).map((q) => (
              <button
                key={q}
                type="button"
                className="rhine-choice"
                aria-pressed={settings.quality === q}
                onClick={() => update({ quality: q })}
                tabIndex={open ? 0 : -1}
              >
                {QUALITY_LABEL[q]}
              </button>
            ))}
          </div>
        </SettingRow>

        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" className="rhine-actbtn ghost" onClick={toggleFullscreen} tabIndex={open ? 0 : -1}>
            全屏 FULLSCREEN
          </button>
          {onReplay && (
            <button type="button" className="rhine-actbtn ghost" onClick={onReplay} tabIndex={open ? 0 : -1}>
              重播开场 REPLAY BOOT
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** 设置行 */
function SettingRow({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-4 border-b py-4"
      style={{ borderColor: 'var(--rhine-hairline)' }}
    >
      <div className="min-w-[240px]">
        <div className="text-[14px] font-semibold">{label}</div>
        <div className="mt-1 text-[12px]" style={{ color: 'var(--rhine-ink-dim)' }}>{hint}</div>
      </div>
      {children}
    </div>
  );
}

/** 开关 */
function Toggle({
  checked,
  onChange,
  tabIndex,
  labelOn,
  labelOff,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  tabIndex?: number;
  labelOn: string;
  labelOff: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className="rhine-choice"
      onClick={() => onChange(!checked)}
      tabIndex={tabIndex}
    >
      {checked ? labelOn : labelOff}
    </button>
  );
}
