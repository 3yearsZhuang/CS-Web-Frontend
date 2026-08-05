/**
 * @file EmptyState — 统一空状态组件（编辑式技术极简风格）
 *
 * 收敛全站手写空状态（32+ 处），提供一致的视觉语言：
 *   - 居中排版 + 等宽元数据标签（可选）
 *   - 可自定义提示文案、说明与操作按钮
 *
 * 用法：
 *   <EmptyState message="暂无通知" />
 *   <EmptyState label="// EMPTY" message="暂无内容">
 *     <Link href="/new">创建第一篇</Link>
 *   </EmptyState>
 */
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  /** 等宽元数据标签（如 "// EMPTY"），可选 */
  label?: string;
  /** 主提示文案（必填） */
  message: string;
  /** 次要说明文案，可选 */
  hint?: string;
  /** 可选操作区（按钮/链接），渲染在提示下方 */
  action?: ReactNode;
  /** 垂直内边距，默认 py-20 */
  className?: string;
}

export function EmptyState({
  label,
  message,
  hint,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`py-20 text-center ${className}`} role="status" aria-live="polite">
      {label && (
        <div className="meta-mono text-[var(--muted-foreground)] text-[14px] mb-2">
          {label}
        </div>
      )}
      <div className="meta-mono text-[var(--muted-foreground)] text-[12px]">
        {message}
      </div>
      {hint && (
        <p className="mt-2 text-sm text-[var(--muted-foreground)] max-w-md mx-auto">
          {hint}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
