/**
 * @file FloatingCapsuleSidebar — 悬浮折叠胶囊侧边栏，Hero 折叠后显示
 *
 * 设计原则：
 *   - 折叠态仅显示编号，hover / 键盘 focus / 首次访问演示时展开完整标签
 *   - 展开判定三源合一（hovered || focused || peeking），键盘可达（onFocus/onBlur）
 *   - 圆角走 --radius-capsule / --radius-capsule-item token（见 globals.css）
 *   - 首次访问播放一次 peek 演示动画（localStorage 记忆，尊重 reduced-motion）
 *
 * 移动端兼容：
 *   - md 以下降级为 SectionNav 换行 tab 条（始终可见）
 */
'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EASE } from '@/shared/utils/ui-constants';
import { SectionNav } from '@/components/primitives/section-nav';

/** 胶囊 Tab 项 */
export interface CapsuleTab {
  key: string;
  num: string;
  label: string;
}

interface FloatingCapsuleSidebarProps {
  tabs: CapsuleTab[];
  activeKey: string;
  onTabChange: (key: string) => void;
  /** 控制整个胶囊的淡入/淡出 — Hero 折叠后 true，展开时 false */
  visible?: boolean;
}

/** 首次访问 peek 演示时长（ms），完成后回落折叠态 */
const PEEK_DURATION = 2600;
/** localStorage 标记键 — 仅首次访问播放一次展开演示 */
const PEEK_STORAGE_KEY = 'capsule-peek-seen';

/** 悬浮胶囊侧边栏 — Hero 折叠后显示，支持 Tab 切换 */
export function FloatingCapsuleSidebar({
  tabs,
  activeKey,
  onTabChange,
  visible = true,
}: FloatingCapsuleSidebarProps) {
  const capsuleRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [peeking, setPeeking] = useState(false);

  /** 展开判定：鼠标 hover / 键盘焦点 / 首次访问演示 任一满足即展开 */
  const expanded = hovered || focused || peeking;

  // 首次访问（桌面端）播放一次 peek 演示，帮助用户发现折叠态的完整标签。
  // 仅在胶囊可见后触发（Hero 已折叠），reduced-motion 用户跳过。
  useEffect(() => {
    if (!visible) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (!window.matchMedia('(min-width: 768px)').matches) return;
      if (window.localStorage.getItem(PEEK_STORAGE_KEY)) return;
      setPeeking(true);
      timer = setTimeout(() => {
        setPeeking(false);
        window.localStorage.setItem(PEEK_STORAGE_KEY, '1');
      }, PEEK_DURATION);
    } catch {
      // localStorage 不可用（隐私模式等）时静默跳过演示，不影响主功能
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [visible]);

  const handleMouseEnter = useCallback(() => setHovered(true), []);
  const handleMouseLeave = useCallback(() => setHovered(false), []);
  const handleFocus = useCallback(() => setFocused(true), []);
  const handleBlur = useCallback(() => setFocused(false), []);

  if (tabs.length === 0) return null;

  return (
    <>
      {/* ── 桌面端：悬浮折叠胶囊（AnimatePresence 淡入/淡出） ── */}
      <AnimatePresence>
        {visible && (
          <motion.div
            ref={capsuleRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onFocus={handleFocus}
            onBlur={handleBlur}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="
              hidden md:block
              fixed z-30
              top-1/2 -translate-y-1/2
              left-4 lg:left-6
            "
          >
            <motion.div
              animate={{
                borderRadius: expanded ? 16 : 28,
                padding: expanded ? 12 : 8,
              }}
              transition={{ duration: 0.35, ease: EASE }}
              className="
                flex flex-col gap-1
                hero-acrylic
                border border-[var(--border)]
                rounded-[var(--radius-capsule)]
                max-h-[calc(100vh-160px)]
                overflow-y-auto
              "
            >
              {tabs.map((tab) => {
                const isActive = activeKey === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => onTabChange(tab.key)}
                    onMouseEnter={(e) => {
                      e.stopPropagation();
                    }}
                    className={`
                      group
                      flex items-center
                      px-[0.55rem] py-[0.55rem]
                      rounded-[var(--radius-capsule-item)]
                      transition-colors duration-200
                      ${isActive ? 'bg-[var(--primary)]/[0.08]' : 'hover:bg-[var(--primary)]/[0.12]'}
                      cursor-pointer
                      relative
                      focus-ring
                    `}
                  >
                    {/* active 圆点指示器（仅折叠态显示） */}
                    {!expanded && isActive && (
                      <span className="absolute left-1/2 -translate-x-1/2 top-[3px] w-[5px] h-[5px] rounded-full bg-[var(--primary)]" />
                    )}

                    {/* 编号 — 始终可见 */}
                    <span
                      className={`
                        meta-mono text-[11px] tracking-[0.08em] min-w-[24px] text-center
                        transition-colors duration-200
                        ${isActive ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}
                      `}
                    >
                      {tab.num}
                    </span>

                    {/* 标签 — hover / focus / peek 时展开 */}
                    <span
                      className={`
                        meta-mono text-[11px]
                        overflow-hidden whitespace-nowrap
                        transition-all duration-300
                        ${isActive ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}
                      `}
                      style={{
                        maxWidth: expanded ? '140px' : '0px',
                        opacity: expanded ? 1 : 0,
                        marginLeft: expanded ? '8px' : '0px',
                      }}
                    >
                      {tab.label}
                    </span>
                  </button>
                );
              })}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 移动端：自动换行 tab 条（不受 visible 控制，始终显示） ── */}
      <div className="md:hidden mb-6 mt-4 px-4 sm:px-6">
        <SectionNav
          options={tabs.map((t) => ({ value: t.key, label: t.label, num: t.num }))}
          value={activeKey}
          onChange={onTabChange}
          layoutClassName="flex flex-wrap gap-x-5 gap-y-3 py-1"
        />
      </div>
    </>
  );
}
