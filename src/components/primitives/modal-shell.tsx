/**
 * @file ModalShell — 通用模态框外壳（FrontDoc-UIButton.md §7 Step-Modal）
 *
 * 从 admin/ui/shared.tsx 提升为全局原语：支持 focus trap、Escape 关闭、点击遮罩关闭、滚动锁定。
 * admin 的 shared.tsx 已改为 re-export 兼容（业务域代码无需改动）。
 */

'use client';

import { type ReactNode } from 'react';
import { useFocusTrap } from '@/shared/hooks/use-focus-trap';

/** 通用模态框外壳，支持 focus trap、Escape 关闭、点击遮罩关闭 */
export function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const containerRef = useFocusTrap<HTMLDivElement>({
    active: true,
    onClose,
    lockScroll: true,
  });

  return (
    <div
      className="fixed inset-0 z-[var(--z-header)] flex items-start sm:items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-lg my-8 bg-[var(--background)] border border-[var(--border)] shadow-[var(--shadow-modal)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[var(--border)]">
          <div className="meta-mono text-[var(--primary)]">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="focus-amber meta-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-[14px] leading-none"
            aria-label="关闭"
          >
            ✕
          </button>
        </div>
        {/* 内容 */}
        <div className="px-5 sm:px-6 py-6">{children}</div>
      </div>
    </div>
  );
}
