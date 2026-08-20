/**
 * @file Badge — 统一状态/标签徽章组件（FrontDoc-UID.md §16）
 *
 * 收口全站手写 `meta-mono px-2 py-0.5 border` 徽章三元（green/emerald/amber/red 各写各的）。
 * 统一视觉：直角、等宽 10px、uppercase、无圆角；语义色枚举 variant。
 * 纯展示组件（span），不承载交互。
 */

import type { HTMLAttributes } from 'react';

export type BadgeVariant = 'muted' | 'primary' | 'success' | 'amber' | 'danger';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** 语义色（默认 muted） */
  variant?: BadgeVariant;
}

const badgeVariantClass: Record<BadgeVariant, string> = {
  muted: 'badge badge-muted',
  primary: 'badge badge-primary',
  success: 'badge badge-success',
  amber: 'badge badge-amber',
  danger: 'badge badge-danger',
};

/** 通用徽章组件 — 支持语义色枚举 */
export function Badge({ variant = 'muted', className = '', ...props }: BadgeProps) {
  return <span className={`${badgeVariantClass[variant]} ${className}`.trim()} {...props} />;
}
