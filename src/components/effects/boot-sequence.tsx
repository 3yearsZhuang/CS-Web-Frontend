'use client';

/**
 * @file BootSequence — Rhine 终端开场（/lab 作用域 · FrontDoc-UID §17）
 *
 * 复刻 Rhine Lab 终端开场时间轴：逐字输入 → 标志绘制 → 身份接入 →
 * 权限扫描（双环收拢 + 橙色节点）→ 欢迎转场（黑条横扫 + 黑白闪切）→ ENTER。
 * 风格以 RhineLabUI 仓库为准（暖灰纸底 + 杏金 + 细线紧凑排字）；
 * 终端动效经决策豁免 FrontDoc-UID §11，仅限 .rhine-scope 作用域。
 *
 * 可访问性：
 * - role="status" + aria-label 承担实质信息，动画层整体 aria-hidden
 * - prefers-reduced-motion：跳过全部时序，直接呈现 ENTER SYSTEM
 * - Enter / Esc 跳过开场；ENTER SYSTEM（或再次 Enter / Esc）确认进入
 */
import { useCallback, useEffect, useRef, useState } from 'react';

/** BootSequence Props */
export interface BootSequenceProps {
  /** 逐字输入的终端名 */
  terminalName?: string;
  /** 品牌三行 — [主名, 副标, 底行] */
  brandLines?: readonly [string, string, string];
  /** 用户确认进入（ENTER SYSTEM）后触发；父组件负责卸载遮罩 */
  onEnter: () => void;
  /** 是否减少动态效果（由宿主注入终端设置；缺省时跟随系统偏好） */
  reduceMotion?: boolean;
}

/** 开场阶段 */
type Phase = 'typing' | 'brand' | 'ident' | 'scan' | 'welcome' | 'enter';

/** 各阶段停留（ms）— 与 design-demos/rhine-lab/01-boot-sequence.html 对齐 */
const PHASE_HOLD = { brand: 2400, ident: 1900, scan: 2400, welcome: 1700 } as const;
const TYPE_INTERVAL = 70;
const TYPE_START = 400;
const TYPE_HOLD = 650;
const CUT_MS = 340;
const LEAVE_MS = 650;

export function BootSequence({
  terminalName = 'FZTBU-CS ARCHIVE OS',
  brandLines = ['FZTBU·CS', 'ARCHIVE TERMINAL', 'INTERNAL DATABASE'] as const,
  reduceMotion,
  onEnter,
}: BootSequenceProps) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>('typing');
  const [typed, setTyped] = useState('');
  const [cut, setCut] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const firedRef = useRef(false);
  const enterBtnRef = useRef<HTMLButtonElement>(null);

  const later = useCallback((ms: number, fn: () => void) => {
    timersRef.current.push(setTimeout(fn, ms));
  }, []);
  const clearAll = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);
  /** 黑白闪切（ident→scan / scan→welcome 的过渡帧） */
  const flashCut = useCallback(() => {
    setCut(true);
    later(CUT_MS, () => setCut(false));
  }, [later]);

  // 客户端挂载标记 — SSR/Client 首帧一致（稳定占位遮罩），挂载后启动时序
  useEffect(() => {
    setMounted(true);
  }, []);

  // 开场时间轴；reduceMotion 显式传入时以其为准，否则跟随系统偏好
  useEffect(() => {
    if (!mounted) return;
    const skip = reduceMotion ?? window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (skip) {
      setTyped(terminalName);
      setPhase('enter');
      return;
    }
    for (let i = 1; i <= terminalName.length; i++) {
      later(TYPE_START + i * TYPE_INTERVAL, () => setTyped(terminalName.slice(0, i)));
    }
    let at = TYPE_START + terminalName.length * TYPE_INTERVAL + TYPE_HOLD;
    later(at, () => setPhase('brand'));
    at += PHASE_HOLD.brand;
    later(at, () => setPhase('ident'));
    at += PHASE_HOLD.ident;
    later(at, () => { flashCut(); setPhase('scan'); });
    at += PHASE_HOLD.scan;
    later(at, () => { flashCut(); setPhase('welcome'); });
    at += PHASE_HOLD.welcome;
    later(at, () => setPhase('enter'));
    return clearAll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // ENTER 阶段聚焦主按钮（不用 autoFocus，避免 jsx-a11y 冲突）
  useEffect(() => {
    if (phase === 'enter' && !leaving) enterBtnRef.current?.focus();
  }, [phase, leaving]);

  /** 推进：开场中 = 跳过直达 ENTER；ENTER 阶段 = 确认进入（淡出后回调，仅一次） */
  const advance = useCallback(() => {
    if (firedRef.current) return;
    if (phase !== 'enter') {
      clearAll();
      setTyped(terminalName);
      setCut(false);
      setPhase('enter');
      return;
    }
    firedRef.current = true;
    setLeaving(true);
    setTimeout(onEnter, LEAVE_MS);
  }, [phase, clearAll, terminalName, onEnter]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') advance();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [advance]);

  // SSR / Client 首次 render：稳定占位（避免 hydration mismatch）
  if (!mounted) {
    return (
      <div
        role="status"
        aria-label="FZTBU·CS Archive Terminal 启动序列"
        aria-hidden="true"
        className="fixed inset-0 z-[var(--z-transition)]"
        style={{ background: '#ffffff' }}
      />
    );
  }

  const paper = phase === 'enter' || leaving;

  return (
    <div
      role="status"
      aria-label="FZTBU·CS Archive Terminal 启动序列"
      className={`rhine-scope fixed inset-0 z-[var(--z-transition)] overflow-hidden${cut ? ' rhine-cut' : ''}`}
      style={{
        background: paper ? 'var(--rhine-paper)' : '#ffffff',
        color: 'var(--rhine-ink)',
        fontFamily: 'var(--rhine-sans)',
        opacity: leaving ? 0 : 1,
        pointerEvents: leaving ? 'none' : 'auto',
        transition: `opacity ${LEAVE_MS}ms var(--ease-ark), background 700ms var(--ease-ark)`,
      }}
    >
      <div aria-hidden="true">
        {/* 逐字输入 */}
        {phase === 'typing' && (
          <div
            className="absolute left-[8vw] top-1/2 -translate-y-1/2 whitespace-pre font-light tracking-[0.18em] text-[clamp(20px,3.4vw,44px)]"
            style={{ fontFamily: 'var(--rhine-mono)' }}
          >
            {typed}
            <span className="rhine-cursor" />
          </div>
        )}

        {/* 标志绘制 + 品牌三行 */}
        {phase === 'brand' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-7">
            <svg viewBox="0 0 100 100" className="block h-auto w-[clamp(120px,16vw,200px)]">
              <path className="rhine-ring" pathLength={100} d="M 84 22 A 40 40 0 1 1 78 16" />
              <path className="rhine-ring r2" pathLength={100} d="M 30 14 A 40 40 0 0 1 88 44" />
            </svg>
            <div className="text-center">
              <div className="rhine-bl l1">{brandLines[0]}</div>
              <div className="rhine-bl l2">{brandLines[1]}</div>
              <div className="rhine-bl l3">{brandLines[2]}</div>
            </div>
          </div>
        )}

        {/* 身份接入 */}
        {phase === 'ident' && (
          <div className="absolute inset-0 flex flex-col items-start justify-center gap-3.5 pl-[8vw]">
            <div className="rhine-row">ID CONFIRMED : <span className="rhine-ok">GUEST</span></div>
            <div className="rhine-row">REQUEST RECEIVED</div>
            <div className="rhine-row">START PROCESSING...</div>
          </div>
        )}

        {/* 权限扫描 */}
        {phase === 'scan' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative h-[clamp(220px,30vw,380px)] w-[clamp(220px,30vw,380px)]">
              <div className="rhine-sring inner-b" />
              <div className="rhine-sring outer-w" />
              <div className="rhine-arc" />
              <div className="rhine-node n1" />
              <div className="rhine-node n2" />
              <div className="rhine-core">AUTH</div>
              <div className="rhine-scanlabel">PERMISSION <b>GRANTED</b></div>
            </div>
          </div>
        )}

        {/* 欢迎转场 */}
        {phase === 'welcome' && (
          <div className="absolute inset-0">
            <div className="rhine-bar"><span>WELCOME TO FZTBU·CS</span></div>
            <div className="rhine-sub">INTERNAL DATABASE // ACCESS LEVEL 01</div>
          </div>
        )}
      </div>

      {/* ENTER（可交互元素，置于 aria-hidden 动画层之外） */}
      {phase === 'enter' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6" aria-hidden="false">
          <div className="rhine-brandmini" aria-hidden="true">FZTBU·CS · ARCHIVE TERMINAL</div>
          <button ref={enterBtnRef} type="button" className="rhine-enter-btn" onClick={advance}>
            ENTER SYSTEM
          </button>
        </div>
      )}
    </div>
  );
}
