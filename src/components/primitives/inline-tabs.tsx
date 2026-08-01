/**
 * @file InlineTabs — 下划线风格内联 Tab 共享组件
 */

'use client';

/** InlineTabs 选项 */
export interface InlineTabsOption {
  /** 选项值 */
  value: string;
  /** 显示标签 */
  label: string;
}

interface InlineTabsProps {
  /** 选项列表 */
  options: InlineTabsOption[];
  /** 当前选中值 */
  value: string;
  /** 选中变更回调 */
  onChange: (value: string) => void;
  /** 可选区块标题（如 "Sort"），渲染在左侧 */
  label?: string;
  /** 是否大写显示标签，默认 true */
  uppercase?: boolean;
  /** 额外类名 */
  className?: string;
  /** 选项间 gap，默认 gap-4 */
  gapClassName?: string;
}

/**
 * 下划线风格内联 Tab
 *
 * 统一替代 ReplySortBar、MarkdownEditorBase Edit/Preview 等下划线 tab 实现。
 * 水平紧凑排列，active 项以 primary 色下划线指示。
 */
export function InlineTabs({
  options,
  value,
  onChange,
  label,
  uppercase = true,
  className = '',
  gapClassName = 'gap-4',
}: InlineTabsProps) {
  return (
    <div className={`flex items-center ${gapClassName} ${className}`}>
      {label && (
        <span className="meta-mono text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)]">
          {label}
        </span>
      )}
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`meta-mono text-[11px] transition-colors pb-0.5 focus-amber ${
              uppercase ? 'uppercase tracking-wider' : ''
            } ${
              active
                ? 'text-[var(--foreground)] border-b border-[var(--primary)]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] border-b border-transparent'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
