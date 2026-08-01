/**
 * @file 活动筛选栏 — 搜索 + 状态 + 标签（受控组件，移动端按钮横向滚动）
 */
'use client';

import type { EventItem } from '@/modules/events/types';
import { FilterBar, type FilterBarOption } from '@/components/primitives/filter-bar';

/** 活动状态筛选值 */
export type StatusFilter = '' | 'upcoming' | 'ongoing' | 'ended';

const STATUS_OPTIONS: FilterBarOption[] = [
  { value: '', label: '全部' },
  { value: 'upcoming', label: '即将开始' },
  { value: 'ongoing', label: '进行中' },
  { value: 'ended', label: '已结束' },
];

interface EventFilterBarProps {
  searchInput: string;
  statusFilter: StatusFilter;
  tagFilter: string;
  events: EventItem[];
  onSearchChange: (value: string) => void;
  onStatusChange: (value: StatusFilter) => void;
  onTagChange: (value: string) => void;
}

/**
 * 活动筛选栏组件
 *
 * 受控组件，提供搜索、状态筛选和标签筛选功能。
 * 状态和标签按钮组使用 <FilterBar> 统一实现。
 */
export function EventFilterBar({
  searchInput,
  statusFilter,
  tagFilter,
  events,
  onSearchChange,
  onStatusChange,
  onTagChange,
}: EventFilterBarProps) {
  const allTags = extractAllTags(events);

  // 标签选项：首项为"全部"，其余从活动列表提取
  const tagOptions: FilterBarOption[] = [
    { value: '', label: '全部' },
    ...allTags.map((tag) => ({ value: tag, label: tag })),
  ];

  return (
    <div className="border-t border-b border-[var(--border)] py-6 sm:py-8 mb-0">
      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        {/* 搜索框 */}
        <div className="flex-1 w-full">
          <div className="meta-mono mb-2">Search</div>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索活动..."
            className="w-full bg-transparent border border-[var(--border)] px-4 py-2.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] font-mono transition-colors"
          />
        </div>

        {/* 状态筛选 */}
        <div className="flex-shrink-0">
          <FilterBar
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(v) => onStatusChange(v as StatusFilter)}
            label="Status"
          />
        </div>
      </div>

      {/* 标签筛选 */}
      {allTags.length > 0 && (
        <FilterBar
          options={tagOptions}
          value={tagFilter}
          onChange={(v) => onTagChange(v === tagFilter ? '' : v)}
          label="Tags"
          wrap
          className="flex-shrink-0 w-full"
        />
      )}
    </div>
  );
}

/** 从活动列表中提取所有唯一标签 */
function extractAllTags(events: EventItem[]): string[] {
  const tagSet = new Set<string>();
  for (const e of events) {
    for (const t of e.tags) tagSet.add(t);
    for (const t of e.topics) tagSet.add(t);
  }
  return Array.from(tagSet).sort();
}
