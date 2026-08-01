/**
 * @file Input — 统一输入框 / 文本域 / 下拉组件，封装 INPUT_CLASS
 */

import { forwardRef, type ReactNode } from 'react';
import { INPUT_CLASS } from '@/shared/utils/ui-constants';

/** Input 组件 Props */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** 渲染为 input / textarea / select（默认 input） */
  as?: 'input' | 'textarea' | 'select';
  /** meta-mono 编号标签（如 "[ 01 ] Email"） */
  label?: string;
  /** 错误提示文本 */
  error?: string;
  /** 子元素（仅 as="select" 时需要 <option>） */
  children?: ReactNode;
}

/** 通用输入组件 — 支持 input/textarea/select 多种变体 */
export const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, InputProps>(
  function Input({ as: Component = 'input', label, error, children, className = '', ...props }, ref) {
    const baseClass = `${INPUT_CLASS} ${className}`;

    const labelEl = label ? (
      <label className="block meta-mono text-[var(--muted-foreground)] mb-1.5">{label}</label>
    ) : null;

    const errorEl = error ? (
      <p className="mt-1 text-[11px] font-mono text-[var(--destructive)]">{error}</p>
    ) : null;

    const renderInput = () => {
      if (Component === 'textarea') {
        return (
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            className={baseClass}
            {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        );
      }

      if (Component === 'select') {
        return (
          <select
            ref={ref as React.Ref<HTMLSelectElement>}
            className={`${baseClass} appearance-none pr-8 cursor-pointer`}
            {...(props as React.SelectHTMLAttributes<HTMLSelectElement>)}
          >
            {children}
          </select>
        );
      }

      return (
        <input
          ref={ref as React.Ref<HTMLInputElement>}
          className={baseClass}
          {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
        />
      );
    };

    return (
      <div>
        {labelEl}
        {renderInput()}
        {errorEl}
      </div>
    );
  },
);