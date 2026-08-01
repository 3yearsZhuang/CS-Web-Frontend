/**
 * @file CollapsingHero — Hero 折叠外壳，滚动时折叠为顶部胶囊导航栏
 */

'use client';

import { type ReactNode } from 'react';
import { StaggerContainer } from '@/components/effects/motion-primitives';
import { PageHeaderBackground } from '@/components/layout/page-header-background';
import { FloatingCapsuleSidebar, type CapsuleTab } from '@/components/layout/floating-capsule-sidebar';

/** Hero 折叠状态 */
export interface HeroState {
  collapsed: boolean;
  capsuleVisible: boolean;
  onRevealComplete: () => void;
  onTitleClick: () => void;
}

/** CollapsingHero Props */
export interface CollapsingHeroProps {
  /** 章节编号（如 "00"） */
  index: string;
  /** 章节标签（如 "Community"），用于 data-section-nav */
  label: string;
  /** useCollapsingHero() 的返回值 */
  hero: HeroState;
  /** PageHeaderBackground 的 pageKey（不传则不渲染背景） */
  pageKey?: string;
  /** 展开时的最小高度（默认 60vh） */
  minHeight?: string;
  /** 内容区最大宽度（默认 1600px） */
  maxWidth?: string;
  /** 胶囊侧边栏配置（不传则隐藏） */
  capsule?: {
    tabs: CapsuleTab[];
    activeKey: string;
    onTabChange: (key: string) => void;
  };
  /** section-marker 下方额外内容（如返回链接） */
  sidebarBottom?: ReactNode;
  /** 标题和描述内容（RevealTitle + RevealItem 等） */
  children: ReactNode;
}

/** 可折叠 Hero 区 — 滚动时折叠为顶部胶囊导航栏 */
export function CollapsingHero({
  index,
  label,
  hero,
  pageKey,
  minHeight = '60vh',
  maxWidth = '1600px',
  capsule,
  sidebarBottom,
  children,
}: CollapsingHeroProps) {
  const { collapsed, capsuleVisible, onRevealComplete } = hero;

  return (
    <>
      <section
        data-section-nav={`${index}|${label}`}
        style={{ minHeight: collapsed ? undefined : minHeight }}
        className={`relative px-4 sm:px-6 md:px-8 flex flex-col justify-center overflow-hidden transition-all hero-reveal ${
          collapsed
            ? 'sticky top-16 z-30 py-3 sm:py-4 min-h-0 hero-acrylic'
            : 'py-20 sm:py-32'
        }`}
      >
        {pageKey != null && pageKey !== '' && (
          <div
            className={`transition-opacity hero-reveal ${
              collapsed ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <PageHeaderBackground pageKey={pageKey} />
          </div>
        )}
        <div
          className="relative z-10 mx-auto w-full"
          style={{ maxWidth }}
        >
          <StaggerContainer onComplete={onRevealComplete}>
            <div className={`grid grid-cols-12 gap-0 ${collapsed ? 'items-center' : ''}`}>
              <div className={`col-span-12 md:col-span-2 ${collapsed ? 'mb-0' : 'mb-6 md:mb-0'}`}>
                <div className="section-marker">[ {index} ]</div>
                {sidebarBottom}
              </div>
              <div className="col-span-12 md:col-span-10">
                {children}
              </div>
            </div>
          </StaggerContainer>
        </div>
      </section>

      {capsule && (
        <FloatingCapsuleSidebar
          visible={capsuleVisible}
          tabs={capsule.tabs}
          activeKey={capsule.activeKey}
          onTabChange={capsule.onTabChange}
        />
      )}
    </>
  );
}