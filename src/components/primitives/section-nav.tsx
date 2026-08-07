/**
 * @file SectionNav — section-marker 编号风格导航 Tab 共享组件
 */

'use client';

/** SectionNav 选项 */
export interface SectionNavOption {
  /** 选项值 */
  value: string;
  /** 显示标签 */
  label: string;
  /** 章节编号，如 "01" */
  num: string;
}

interface SectionNavProps {
  /** 选项列表 */
  options: SectionNavOption[];
  /** 当前选中值 */
  value: string;
  /** 选中变更回调 */
  onChange: (value: string) => void;
  /** 内层 flex 容器类名，控制方向/gap/换行 */
  layoutClassName?: string;
  /** 外层容器类名 */
  className?: string;
  /** 标签与编号之间的间距类名，默认 mt-1.5 */
  labelSpacingClassName?: string;
}

/**
 * 章节式导航 Tab
 *
 * 统一替代 FloatingCapsuleSidebar 移动端 tab 条、ProfileCommunityTab sub-tab 等编号导航实现。
 * 每项以 section-marker 编号 + meta-mono 标签呈现，opacity 指示激活态。
 */
export function SectionNav({
  options,
  value,
  onChange,
  layoutClassName = 'flex flex-wrap gap-x-5 gap-y-3',
  className = '',
  labelSpacingClassName = 'mt-1.5',
}: SectionNavProps) {
  return (
    <div className={`${layoutClassName} ${className}`}>
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`focus-amber text-left transition-opacity shrink-0 ${
              active ? 'opacity-100' : 'opacity-40 hover:opacity-70'
            }`}
          >
            <div className="section-marker">[ {opt.num} ]</div>
            <div className={`meta-mono text-[11px] ${labelSpacingClassName}`}>{opt.label}</div>
          </button>
        );
      })}
    </div>
  );
}
