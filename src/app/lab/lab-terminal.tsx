'use client';

/**
 * @file LabTerminal — /lab 终端入口（C1：BootSequence 门控 + 终端大厅）
 *
 * 会话内已进入过（sessionStorage 标记）则跳过开场直达大厅；
 * 大厅提供 REPLAY 重播开场。C2（ArchiveIndex 档案柜）/ B（3D ArchiveScene）
 * 落地后在此开放入口，状态行同步更新。
 *
 * 视觉：全部走 .rhine-scope 令牌（FrontDoc-UID §17），不污染全局双主题。
 */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BootSequence } from '@/components/effects/boot-sequence';
import { TerminalSettingsPanel, useMotionPreference } from '@/components/rhine/terminal-settings';

/** 会话级「已进入」标记 — 仅当前浏览器会话有效 */
const BOOTED_KEY = 'fztbu-lab-booted';

/** 终端落地序列状态行（随 C2/C3/B 推进更新） */
const ROADMAP = [
  { no: '01', name: 'BOOT SEQUENCE', desc: '终端开场 · 逐字输入 / 标志绘制 / 权限扫描 / 欢迎转场', status: 'LIVE', href: undefined },
  { no: '02', name: 'ARCHIVE INDEX', desc: '档案柜索引 · 分类检索 / 收藏 / 编号滚动 / 标题快切', status: 'LIVE', href: '/lab/archive' },
  { no: '03', name: 'FEEDBACK PRIMITIVES', desc: '反馈原语 · Rolling Number / 设置面板', status: 'C3 · 待落地', href: undefined },
  { no: '04', name: '3D ARCHIVE SCENE', desc: '三维档案阵列 · 透射材质 / 镜头编排 / 抽取归位', status: 'LIVE', href: '/lab/terminal' },
] as const;

export function LabTerminal() {
  // null = 未判定（SSR 与客户端首帧一致，避免 hydration 闪烁）
  const [booted, setBooted] = useState<boolean | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // 动效偏好（系统 + 终端设置）——注入终端开场
  const reduceMotion = useMotionPreference();

  useEffect(() => {
    let entered = false;
    try {
      entered = sessionStorage.getItem(BOOTED_KEY) === '1';
    } catch {
      /* 隐私模式下 sessionStorage 不可用，按未进入处理 */
    }
    setBooted(entered);
  }, []);

  // 设置面板关闭（Esc）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSettingsOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const enter = useCallback(() => {
    try {
      sessionStorage.setItem(BOOTED_KEY, '1');
    } catch {
      /* 忽略存储失败，仅内存态 */
    }
    setBooted(true);
  }, []);

  const replay = useCallback(() => {
    try {
      sessionStorage.removeItem(BOOTED_KEY);
    } catch {
      /* 忽略存储失败 */
    }
    setSettingsOpen(false);
    setBooted(false);
  }, []);

  // 未判定：渲染与 BootSequence SSR 占位一致的白场遮罩
  if (booted === null) {
    return <div className="fixed inset-0 z-[var(--z-transition)] bg-white" aria-hidden="true" />;
  }
  if (!booted) {
    return <BootSequence onEnter={enter} reduceMotion={reduceMotion} />;
  }
  return (
    <>
      <LabLobby onReplay={replay} onOpenSettings={() => setSettingsOpen(true)} />
      <TerminalSettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onReplay={replay}
      />
    </>
  );
}

/** 终端大厅 — 落地序列导航与状态 */
function LabLobby({ onReplay, onOpenSettings }: { onReplay: () => void; onOpenSettings: () => void }) {
  return (
    <main
      className="rhine-scope relative min-h-screen pt-16"
      style={{
        background: 'var(--rhine-paper)',
        color: 'var(--rhine-ink)',
        fontFamily: 'var(--rhine-sans)',
      }}
    >
      <div className="mx-auto max-w-[1100px] px-6 py-16 sm:py-24">
        <div className="rhine-kicker">FZTBU·CS ARCHIVE TERMINAL</div>
        <h1 className="mt-5 text-[clamp(28px,5vw,52px)] font-semibold leading-tight tracking-[0.01em]">
          实验室 · 档案终端
        </h1>
        <p className="mt-5 max-w-[640px] text-[14px] leading-[1.9]" style={{ color: 'var(--rhine-ink-dim)' }}>
          Rhine Lab 设计语言的落地体验场。当前开放「终端开场」；
          档案柜索引（C2）、反馈原语（C3）与三维档案阵列（B）将按落地序列在此开放。
        </p>

        {/* 落地序列状态表 */}
        <div className="mt-14" style={{ borderTop: '1px solid var(--rhine-hairline)' }}>
          {ROADMAP.map((row) => (
            <div
              key={row.no}
              className="grid grid-cols-[64px_1fr_auto] items-baseline gap-4 py-4"
              style={{ borderBottom: '1px solid var(--rhine-hairline)' }}
            >
              <span
                className="text-[11px] tracking-[0.1em]"
                style={{ fontFamily: 'var(--rhine-mono)', color: 'var(--rhine-ink-dim)' }}
              >
                [ {row.no} ]
              </span>
              <span>
                {row.href ? (
                  <Link
                    href={row.href}
                    className="block text-[14px] font-semibold tracking-[0.06em] transition-colors hover:text-[var(--rhine-amber)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--rhine-amber)]"
                  >
                    {row.name} →
                  </Link>
                ) : (
                  <span className="block text-[14px] font-semibold tracking-[0.06em]">{row.name}</span>
                )}
                <span
                  className="mt-1 block text-[12px]"
                  style={{ color: 'var(--rhine-ink-dim)' }}
                >
                  {row.desc}
                </span>
              </span>
              <span
                className="text-[10px] tracking-[0.2em] uppercase"
                style={{
                  fontFamily: 'var(--rhine-mono)',
                  color: row.status === 'LIVE' ? 'var(--rhine-amber)' : 'var(--rhine-ink-dim)',
                  fontWeight: row.status === 'LIVE' ? 600 : 400,
                }}
              >
                {row.status}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-4">
          <button type="button" className="rhine-btn" onClick={onReplay}>
            REPLAY BOOT
          </button>
          <button type="button" className="rhine-btn" onClick={onOpenSettings}>
            设置 SETTINGS
          </button>
          <Link href="/" className="rhine-btn ghost">
            ← 返回首页
          </Link>
        </div>
      </div>
    </main>
  );
}
