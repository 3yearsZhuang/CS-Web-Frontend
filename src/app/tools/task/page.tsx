/**
 * @file 协会任务发布页（/tools/task）— 任务卡片列表 + 认领 + 积分展示
 * 管理员可创建/发布/关闭/删除任务、审核认领
 *
 * 装配层（GENERAL 2.2 展示/容器分离、2.4「组件 > 500 行拆分」）：
 * 仅负责 tab 状态、Hero、侧边栏与子组件编排；数据与逻辑下放到 `useTasks` Hook 与各 tab 子组件。
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { CollapsingHero, type HeroState } from '@/components/layout/collapsing-hero';
import { useCollapsingHero } from '@/shared/hooks/use-collapsing-hero';
import { useTasks } from './use-tasks';
import { BoardTab } from './board-tab';
import { MyClaimsTab } from './my-claims-tab';
import { PointsTab } from './points-tab';
import type { TaskTab } from './task-shared';

export default function TaskPage() {
  const { collapsed: heroCollapsed, capsuleVisible, onRevealComplete, onTitleClick } = useCollapsingHero();

  const hero: HeroState = {
    collapsed: heroCollapsed,
    capsuleVisible,
    onRevealComplete,
    onTitleClick,
  };
  const [activeTab, setActiveTab] = useState<TaskTab>('board');

  const tasks = useTasks();
  const { user, loadMyClaims, loadPoints } = tasks;

  const taskTabs = useMemo(
    () => [
      { key: 'board', num: '01', label: '任务板' },
      { key: 'my-claims', num: '02', label: '我的认领' },
      { key: 'points', num: '03', label: '积分' },
    ],
    [],
  );

  // Tab 切换时按需加载「我的认领」「积分」
  useEffect(() => {
    if (activeTab === 'my-claims') loadMyClaims();
    if (activeTab === 'points') loadPoints();
  }, [activeTab, loadMyClaims, loadPoints]);

  return (
    <main className="relative pt-16">
      {/* ============ [ 00 ] Hero ============ */}
      <CollapsingHero
        index="00"
        label="任务板"
        hero={hero}
        minHeight="50vh"
        capsule={{
          tabs: taskTabs,
          activeKey: activeTab,
          onTabChange: (key) => setActiveTab(key as TaskTab),
        }}
        sidebarBottom={
          <Link
            href="/tools"
            className="meta-mono text-[var(--muted-foreground)] hover:text-[var(--primary)] transition-colors inline-block mt-2 text-[11px]"
          >
            ← 返回
          </Link>
        }
      >
        <h1
          className={`display-serif cursor-pointer transition-all hero-reveal origin-left ${
            hero.collapsed
              ? 'text-[clamp(22px,4vw,36px)] leading-tight'
              : 'text-[clamp(36px,9vw,120px)] leading-[1.1]'
          }`}
          onClick={onTitleClick}
        >
          任务<button className="text-[var(--primary)] focus-amber" onClick={onTitleClick}>发布板</button>
        </h1>
        <p className="mt-4 sm:mt-6 text-[14px] sm:text-[15px] text-[var(--muted-foreground)] leading-[1.8] max-w-2xl">
          协会任务板 — 类似冒险者公会。
          <span className="serif-italic text-[var(--foreground)]">领取任务、完成挑战、获得积分奖励</span>
          。
        </p>
      </CollapsingHero>

      {/* ============ Tab 合并区 ============ */}
      <section className="px-4 sm:px-6 md:px-8 py-16 sm:py-24 border-t border-[var(--border)]">
        <div className="max-w-[1600px] mx-auto w-full md:pl-[72px] lg:pl-[88px]">
          <div>
            {activeTab === 'board' && <BoardTab {...tasks} />}
            {activeTab === 'my-claims' && <MyClaimsTab {...tasks} />}
            {activeTab === 'points' && <PointsTab {...tasks} />}
          </div>
        </div>
      </section>
    </main>
  );
}
