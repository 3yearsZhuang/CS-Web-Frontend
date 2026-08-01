/**
 * @file Button — 统一按钮组件，封装 primary / outline / danger 三套样式
 */

import { forwardRef } from 'react';
import { Spinner } from '@/components/primitives/spinner';

type ButtonVariant = 'primary' | 'outline' | 'danger';
type ButtonSize = 'md' | 'sm';

/** Button 组件 Props */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** 按钮变体（默认 primary） */
  variant?: ButtonVariant;
  /** 按钮尺寸（默认 md） */
  size?: ButtonSize;
  /** 加载状态：自动禁用 + 显示 Spinner */
  loading?: boolean;
}

const variantClass: Record<ButtonVariant, Record<ButtonSize, string>> = {
  primary: { md: 'btn-primary', sm: 'btn-primary-sm' },
  outline: { md: 'btn-outline', sm: 'btn-outline-sm' },
  danger: { md: 'btn-danger', sm: 'btn-danger' },
};

/** 通用按钮组件 — 支持 variant/size/loading 等变体 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button({ variant = 'primary', size = 'md', loading, disabled, children, className = '', ...props }, ref) {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`${variantClass[variant][size]} focus-amber ${isDisabled ? 'disabled:opacity-50 disabled:cursor-not-allowed' : ''} ${className}`}
        {...props}
      >
        {loading && <Spinner variant="inverted" />}
        {children}
      </button>
    );
  },
);