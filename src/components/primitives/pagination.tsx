/**
 * @file Pagination — 共享分页控件（FrontDoc-UIButton.md §3.2 / §3.3 / §7 Step4）
 *
 * 统一替代 topics-manager / users-manager / notification-center / resource 中各自手搓的
 * `← / 页码 / →` 描边按钮，视觉收敛到 .btn-page + .btn-active。
 *
 * 页码模式：
 *   window（默认）— 以当前页为中心的 ≤5 个连续页码（原 topics-manager / users-manager 行为）
 *   ellipsis       — 首尾页固定 + 省略号（原 notification-center 行为）
 *   all            — 渲染全部页码（原 resource 页行为）
 *
 * 选中态：outline（.btn-active，默认）| filled（实色主色，原 notification-center 行为）。
 */

import { forwardRef } from 'react';

export interface PaginationProps {
  /** 当前页（从 1 开始） */
  page: number;
  /** 总页数 */
  totalPages: number;
  /** 翻页回调 */
  onPageChange: (page: number) => void;
  /** 额外容器类名 */
  className?: string;
  /** 页码模式（默认 window） */
  variant?: 'window' | 'ellipsis' | 'all';
  /** 当前页样式（默认 outline = .btn-active） */
  activeVariant?: 'outline' | 'filled';
  /** 是否显示顶部边框（默认 true） */
  showTopBorder?: boolean;
}

export const Pagination = forwardRef<HTMLDivElement, PaginationProps>(
  function Pagination(
    { page, totalPages, onPageChange, className = '', variant = 'window', activeVariant = 'outline', showTopBorder = true },
    ref,
  ) {
    if (totalPages <= 1) return null;

    const pageNums: (number | 'ellipsis')[] =
      variant === 'all'
        ? Array.from({ length: totalPages }, (_, i) => i + 1)
        : variant === 'ellipsis'
          ? buildEllipsisPages(page, totalPages)
          : buildWindowPages(page, totalPages);

    const activeClass =
      activeVariant === 'filled'
        ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]'
        : 'btn-active';

    return (
      <div
        ref={ref}
        className={`flex items-center justify-center gap-2 py-6 ${showTopBorder ? 'border-t border-[var(--border)]' : ''} ${className}`}
      >
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="btn-page focus-ring"
          aria-label="上一页"
        >
          ←
        </button>
        {pageNums.map((n, idx) =>
          n === 'ellipsis' ? (
            <span
              key={`ellipsis-${idx}`}
              className="meta-mono px-1 text-[12px] text-[var(--muted-foreground)]"
            >
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onPageChange(n)}
              className={`btn-page focus-ring ${page === n ? activeClass : ''}`}
              aria-current={page === n ? 'page' : undefined}
            >
              {String(n).padStart(2, '0')}
            </button>
          ),
        )}
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className="btn-page focus-ring"
          aria-label="下一页"
        >
          →
        </button>
      </div>
    );
  },
);

/** window 模式：以当前页为中心，最多 5 个连续页码 */
function buildWindowPages(page: number, totalPages: number): number[] {
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  const nums: number[] = [];
  for (let i = start; i <= end; i++) nums.push(i);
  return nums;
}

/** ellipsis 模式：首尾页固定，中间窗口 + 省略号（对齐原 notification-center 逻辑） */
function buildEllipsisPages(page: number, totalPages: number): (number | 'ellipsis')[] {
  const pages: (number | 'ellipsis')[] = [];
  const maxVisible = 5;
  if (totalPages <= maxVisible + 2) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
    return pages;
  }
  pages.push(1);
  let start = Math.max(2, page - 1);
  let end = Math.min(totalPages - 1, page + 1);
  if (page <= 3) end = maxVisible - 1;
  else if (page >= totalPages - 2) start = totalPages - maxVisible + 2;
  if (start > 2) pages.push('ellipsis');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages - 1) pages.push('ellipsis');
  pages.push(totalPages);
  return pages;
}
