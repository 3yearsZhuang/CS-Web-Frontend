/**
 * @file FilterBar — 直角 segmented 筛选栏共享组件
 */

'use client';

import { ScrollIndicator } from '@/components/effects/scroll-indicator';

/** 筛选选项 */
export interface FilterBarOption {
  /** 选项值 */
  value: string;
  /** 显示标签 */
  label: string;
  /** 可选编号前缀，如 "01" */
  num?: string;
  /** 可选：前置状态圆点样式类（业务域自行提供着色，如活动状态色） */
  dotClassName?: string;
}

interface FilterBarProps {
  /** 筛选选项列表 */
  options: FilterBarOption[];
  /** 当前选中值 */
  value: string;
  /** 选中变更回调 */
  onChange: (value: string) => void;
  /** 可选区块标题，如 "Status"、"Tags" */
  label?: string;
  /** 是否显示编号前缀，默认 false */
  showNumber?: boolean;
  /** 是否允许换行（标签筛选场景），默认 false */
  wrap?: boolean;
  /** 额外类名 */
  className?: string;
}

/**
 * 直角 segmented 筛选栏
 *
 * 统一替代 EventFilterBar 和 community 内联类型 Tab 中的重复实现。
 * 按钮紧贴排列，active 实心 primary 填充，移动端横滚。
 */
export function FilterBar({
  options,
  value,
  onChange,
  label,
  showNumber = false,
  wrap = false,
  className = '',
}: FilterBarProps) {
  return (
    <div className={className}>
      {label && <div className="meta-mono mb-2">{label}</div>}
      <ScrollIndicator className="sm:[&>*]:overflow-visible" gap="gap-0">
        <div
          className={`flex gap-0 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 ${wrap ? 'flex-wrap' : ''}`}
        >
          {options.map((opt) => {
            const active = value === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => onChange(opt.value)}
                className={`flex items-center gap-1.5 whitespace-nowrap px-4 py-2.5 text-[11px] font-mono uppercase tracking-wider border border-[var(--border)] transition-colors focus-amber ${
                  active
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)] border-[var(--primary)]'
                    : 'bg-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--primary)]'
                }`}
              >
                {opt.dotClassName && (
                  <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${opt.dotClassName}`} />
                )}
                {showNumber && opt.num && (
                  <span className="opacity-60 mr-2">{opt.num}</span>
                )}
                {opt.label}
              </button>
            );
          })}
        </div>
      </ScrollIndicator>
    </div>
  );
}
