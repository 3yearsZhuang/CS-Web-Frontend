/**
 * @file WorkbenchCard — 工作台卡片统一外壳（widget 共享骨架）。
 * 收敛 9 个 widget 的重复样板：DnaCard corner + meta-mono 标题头 + 右上操作区 + 三态（loading/empty/error）。
 * children 在 flex-1 容器内透传，widget 内部自身的 flex-1 布局语义保持不变（列表滚动区等）。
 *
 * 约定（FrontDoc-UID §15.3 / §6.3.2）：
 * - 颜色只用项目令牌（var(--muted-foreground) 等），不引入散落 hex
 * - 标题带 icon 与否由调用方 title 决定（保持 flex gap-2 对齐）
 * - 三态为「整卡级」状态（如加载中 / 未登录 / 整卡无数据）；
 *   局部空态（如列表区为空但输入行仍显示）由调用方在 children 内部自行处理
 */
'use client';

import type { ReactNode } from 'react';
import { DnaCard } from '@/components';

export interface WorkbenchCardProps {
  /** 右上像素角标（HI/TSK/GIT/AUX/NOTE/FCS/EXM…），number 自动补零 */
  corner: string | number;
  /** 标题头内容（可含 icon + 文案 + 徽章） */
  title: ReactNode;
  /** 右上操作区（清空/刷新/设置等按钮组） */
  actions?: ReactNode;
  /** 整卡加载态：true 渲染统一「…」占位 */
  loading?: boolean;
  /** 整卡空态内容：false / null / undefined 表示无空态 */
  empty?: ReactNode | false;
  /** 整卡错误态（未登录等），优先于 empty 渲染 */
  error?: ReactNode;
  /** 附加类名（布局微调，勿覆盖 padding/布局基类） */
  className?: string;
  children: ReactNode;
}

/** 工作台卡片统一外壳 */
export function WorkbenchCard({
  corner,
  title,
  actions,
  loading = false,
  empty = false,
  error,
  className = '',
  children,
}: WorkbenchCardProps) {
  return (
    <DnaCard corner={corner} className={`p-5 flex flex-col gap-4 h-full min-h-0 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="meta-mono text-[11px] uppercase tracking-wider text-[var(--muted-foreground)] flex items-center gap-2">
          {title}
        </h3>
        {actions && <div className="flex items-center gap-1 shrink-0">{actions}</div>}
      </div>
      <div className="flex-1 min-h-0 flex flex-col gap-4">
        {loading ? (
          <div className="flex-1 min-h-0 flex items-center justify-center">
            <span className="text-[13px] text-[var(--muted-foreground)]">…</span>
          </div>
        ) : error ? (
          <div className="flex-1 min-h-0 overflow-y-auto">{error}</div>
        ) : empty !== false && empty != null ? (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <p className="text-[13px] text-[var(--muted-foreground)] py-4 text-center">{empty}</p>
          </div>
        ) : (
          children
        )}
      </div>
    </DnaCard>
  );
}
