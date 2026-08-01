/**
 * @file 管理员面板共享 UI — ModalShell（focus trap）+ Field 通用组件
 */

'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useFocusTrap } from '@/shared/hooks/use-focus-trap';

/* ============= 模态框外壳 ============= */

/** 管理员面板通用模态框外壳，支持 focus trap、Escape 关闭、点击遮罩关闭 */
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
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        className="relative w-full max-w-lg my-8 bg-[var(--background)] border border-[var(--border)] shadow-2xl"
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

/* ============= 表单字段容器 ============= */

/** 表单字段容器，统一 label + 字数统计 + 内容布局 */
export function Field({
  label,
  count,
  children,
}: {
  label: string;
  count?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="meta-mono mb-2 flex items-center justify-between text-[var(--muted-foreground)]">
        <span>[ {label} ]</span>
        {count && <span>{count}</span>}
      </label>
      {children}
    </div>
  );
}
