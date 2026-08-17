/**
 * @file Button — 统一按钮组件，封装 primary / outline / primary-outline / danger /
 * outline-danger / ghost / amber / filled / pixel / pixel-outline 十套变体（FrontDoc-UIButton.md §7）
 *
 * pixel 对：Kimi 风格硬阴影 + steps(2) 按压位移，用于首页 Hero CTA 等像素元数据层场景；
 * 主次按钮统一实色硬阴影，颜色走双主题令牌。
 */

import { forwardRef } from 'react';
import { Spinner } from '@/components/primitives/spinner';

type ButtonVariant = 'primary' | 'outline' | 'primary-outline' | 'danger' | 'outline-danger' | 'ghost' | 'amber' | 'filled' | 'pixel' | 'pixel-outline';
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
  'primary-outline': { md: 'btn-primary-outline', sm: 'btn-primary-outline-sm', xs: 'btn-primary-outline-sm' },
  danger: { md: 'btn-danger', sm: 'btn-danger-sm', xs: 'btn-danger-sm' },
  'outline-danger': { md: 'btn-outline-danger', sm: 'btn-outline-danger-sm', xs: 'btn-outline-danger-sm' },
  ghost: { md: 'btn-ghost', sm: 'btn-ghost', xs: 'btn-ghost' },
  amber: { md: 'btn-amber', sm: 'btn-amber-sm', xs: 'btn-amber-sm' },
  filled: { md: 'btn-filled', sm: 'btn-filled-sm', xs: 'btn-filled-sm' },
  pixel: { md: 'btn-pixel', sm: 'btn-pixel-sm', xs: 'btn-pixel-sm' },
  'pixel-outline': { md: 'btn-pixel-outline', sm: 'btn-pixel-outline-sm', xs: 'btn-pixel-outline-sm' },
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