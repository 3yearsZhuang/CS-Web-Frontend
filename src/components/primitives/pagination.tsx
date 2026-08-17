/**
 * @file Pagination — 共享分页控件（FrontDoc-UIButton.md §3.2 / §3.3）
 *
 * 统一替代 topics-manager / users-manager 中各自手搓的
 * `← / 页码 / →` 描边按钮，视觉收敛到 .btn-page + .btn-active。
 *
 * 页码窗口逻辑与原实现一致：以当前页为中心，最多展示 5 个连续页码。
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
}

export const Pagination = forwardRef<HTMLDivElement, PaginationProps>(
  function Pagination({ page, totalPages, onPageChange, className = '' }, ref) {
    if (totalPages <= 1) return null;

    const max = totalPages;
    const cur = page;
    const start = Math.max(1, Math.min(cur - 2, max - 4));
    const end = Math.min(max, start + 4);
    const pageNums: number[] = [];
    for (let i = start; i <= end; i++) pageNums.push(i);

    return (
      <div
        ref={ref}
        className={`flex items-center justify-center gap-2 py-6 border-t border-[var(--border)] ${className}`}
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
        {pageNums.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onPageChange(n)}
            className={`btn-page focus-ring ${page === n ? 'btn-active' : ''}`}
            aria-current={page === n ? 'page' : undefined}
          >
            {String(n).padStart(2, '0')}
          </button>
        ))}
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
