/**
 * @file Spinner — 加载旋转指示器，primary / inverted 两种颜色变体
 */

/** Spinner Props */
export interface SpinnerProps {
  /** 颜色变体：primary = 主题色，inverted = 反色（用于深色背景按钮内） */
  variant?: 'primary' | 'inverted';
  /** 额外 Tailwind 类名（如自定义尺寸） */
  className?: string;
}

/** 旋转加载指示器 */
export function Spinner({ variant = 'primary', className = '' }: SpinnerProps) {
  const borderColor =
    variant === 'inverted'
      ? 'border-[var(--primary-foreground)]'
      : 'border-[var(--primary)]';

  return (
    <span
      aria-hidden="true"
      className={`inline-block w-3 h-3 border ${borderColor} border-t-transparent rounded-full animate-spin ${className}`}
    />
  );
}