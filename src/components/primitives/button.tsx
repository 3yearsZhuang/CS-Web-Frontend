/**
 * @file Button — 统一按钮组件，封装 primary / outline / danger 三套样式
 */

import { forwardRef } from 'react';
import { Spinner } from '@/components/primitives/spinner';

type ButtonVariant = 'primary' | 'outline' | 'danger' | 'outline-danger' | 'ghost';
type ButtonSize = 'md' | 'sm' | 'xs';

/** Button 组件 Props */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 按钮变体（默认 primary） */
  variant?: ButtonVariant;
  /** 按钮尺寸（默认 md；xs 复用 sm 视觉，用于紧凑/关注等极小操作） */
  size?: ButtonSize;
  /** 选中/按下态：自动套用 .btn-active（用于 outline / ghost / page 的选中强调；solid 变体请勿使用） */
  active?: boolean;
  /** 加载状态：自动禁用 + 显示 Spinner */
  loading?: boolean;
}

const variantClass: Record<ButtonVariant, Record<ButtonSize, string>> = {
  primary: { md: 'btn-primary', sm: 'btn-primary-sm', xs: 'btn-primary-sm' },
  outline: { md: 'btn-outline', sm: 'btn-outline-sm', xs: 'btn-outline-sm' },
  danger: { md: 'btn-danger', sm: 'btn-danger', xs: 'btn-danger' },
  'outline-danger': { md: 'btn-outline-danger', sm: 'btn-outline-danger-sm', xs: 'btn-outline-danger-sm' },
  ghost: { md: 'btn-ghost', sm: 'btn-ghost', xs: 'btn-ghost' },
};

/** 通用按钮组件 — 支持 variant/size/active/loading 等变体 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = 'primary', size = 'md', active = false, loading, disabled, children, className = '', ...props }, ref) {
    const isDisabled = disabled || loading;
    const classes = [
      variantClass[variant][size],
      'focus-ring',
      active ? 'btn-active' : '',
      className,
    ].filter(Boolean).join(' ');

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-pressed={active || undefined}
        className={classes}
        {...props}
      >
        {loading && <Spinner variant="inverted" />}
        {children}
      </button>
    );
  },
);