'use client';

/**
 * @file FloatingCapsuleSidebar — 悬浮折叠胶囊侧边栏，Hero 折叠后显示
 */
import { motion, AnimatePresence } from 'motion/react';
import { useCallback, useRef, useState } from 'react';
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

/** 悬浮胶囊侧边栏 — Hero 折叠后显示，支持 Tab 切换 */
export function FloatingCapsuleSidebar({
  tabs,
  activeKey,
  onTabChange,
  visible = true,
}: FloatingCapsuleSidebarProps) {
  const capsuleRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const handleMouseEnter = useCallback(() => setHovered(true), []);
  const handleMouseLeave = useCallback(() => setHovered(false), []);

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
                borderRadius: hovered ? 16 : 28,
                padding: hovered ? 12 : 8,
              }}
              transition={{ duration: 0.35, ease: EASE }}
              className="
                flex flex-col gap-1
                hero-acrylic
                border border-[var(--border)]
                rounded-[28px]
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
                      rounded-[22px]
                      transition-colors duration-200
                      ${isActive ? 'bg-[var(--primary)]/[0.08]' : 'hover:bg-[var(--primary)]/[0.12]'}
                      cursor-pointer
                      relative
                      focus-amber
                    `}
                  >
                    {/* active 圆点指示器（仅折叠态显示） */}
                    {!hovered && isActive && (
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

                    {/* 标签 — hover 时展开 */}
                    <span
                      className={`
                        meta-mono text-[11px]
                        overflow-hidden whitespace-nowrap
                        transition-all duration-300
                        ${isActive ? 'text-[var(--primary)]' : 'text-[var(--muted-foreground)]'}
                      `}
                      style={{
                        maxWidth: hovered ? '140px' : '0px',
                        opacity: hovered ? 1 : 0,
                        marginLeft: hovered ? '8px' : '0px',
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