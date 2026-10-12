/**
 * @file WorkbenchCard — 工作台卡片统一外壳（widget 共享骨架）。
 * 收敛 9 个 widget 的重复样板：DnaCard corner + meta-mono 标题头 + 右上操作区 + 三态（loading/empty/error）。
 * 已针对像素融合方案进行重构：新增 metaTags 渲染 dna-meta，标题改为 display-serif。
 *
 * 约定（FrontDoc-UID §15.3 / §6.3.2）：
 * - 颜色只用项目令牌（var(--muted-foreground) 等），不引入散落 hex
 * - 三态为「整卡级」状态（如加载中 / 未登录 / 整卡无数据）；
 *   局部空态（如列表区为空但输入行仍显示）由调用方在 children 内部自行处理
 */
'use client';

import type { ReactNode } from 'react';
import { DnaCard } from '@/components/primitives/dna-card';

export interface WorkbenchCardProps {
  /** 右上像素角标（HI/TSK/GIT/AUX/NOTE/FCS/EXM…），number 自动补零 */
  corner: string | number;
  /** 标题内容（衬线大标题展示） */
  title: ReactNode;
  /** 元数据标签数组，渲染为 .dna-meta（如 { label: 'TODAY', dim: '3 PENDING' }） */
  metaTags?: { label: string; dim?: string }[];
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
  metaTags,
  actions,
  loading = false,
  empty = false,
  error,
  className = '',
  children,
}: WorkbenchCardProps) {
  return (
    <DnaCard corner={corner} className={`p-6 flex flex-col h-full min-h-0 ${className}`}>
      {metaTags && metaTags.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 font-pixel text-[11px] tracking-widest mb-3">
          {metaTags.map((tag, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-[var(--primary)] font-bold">{tag.label}</span>
              {tag.dim && <span className="text-[var(--muted-foreground)]">{tag.dim}</span>}
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mb-4">
        <h3 className="display-serif text-[20px] font-medium text-[var(--foreground)] flex items-center gap-2">
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
