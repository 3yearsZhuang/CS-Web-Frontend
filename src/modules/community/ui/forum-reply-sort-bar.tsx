/**
 * @file 回复排序选择器 — 最新/最早/最热（复用 InlineTabs）
 */
'use client';

import { InlineTabs } from '@/components/primitives/inline-tabs';

/** 回复排序模式：最新、最早、最热 */
export type ReplySortMode = 'newest' | 'oldest' | 'hottest';

/** 回复排序选择器属性 */
interface ReplySortBarProps {
  sortMode: ReplySortMode;
  onChange: (mode: ReplySortMode) => void;
  className?: string;
}

const SORT_OPTIONS: { value: ReplySortMode; label: string }[] = [
  { value: 'newest', label: '最新' },
  { value: 'oldest', label: '最早' },
  { value: 'hottest', label: '最热' },
];

/**
 * 回复排序选择器组件
 *
 * 受控组件，提供最新/最早/最热三种排序方式。
 * 选中项以 primary 色下划线指示。
 */
export function ReplySortBar({ sortMode, onChange, className = '' }: ReplySortBarProps) {
  return (
    <InlineTabs
      options={SORT_OPTIONS}
      value={sortMode}
      onChange={(v) => onChange(v as ReplySortMode)}
      label="Sort"
      uppercase={false}
      className={className}
    />
  );
}
