/**
 * @file 活动筛选栏 — 搜索 + 状态（受控组件，移动端按钮横向滚动）
 */
'use client';

import { useTranslations } from 'next-intl';
import { FilterBar, type FilterBarOption } from '@/components/primitives/filter-bar';

/** 活动状态筛选值 */
export type StatusFilter = '' | 'upcoming' | 'ongoing' | 'ended';

interface EventFilterBarProps {
  searchInput: string;
  statusFilter: StatusFilter;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: StatusFilter) => void;
}

/**
 * 活动筛选栏组件
 *
 * 受控组件，提供搜索与状态筛选功能。
 * 状态按钮组使用 <FilterBar> 统一实现。
 */
export function EventFilterBar({
  searchInput,
  statusFilter,
  onSearchChange,
  onStatusChange,
}: EventFilterBarProps) {
  const t = useTranslations('eventsAdmin');
  const statusOptions: FilterBarOption[] = [
    { value: '', label: t('filterAll') },
    { value: 'upcoming', label: t('filterUpcoming'), dotClassName: 'bg-[var(--primary)]' },
    { value: 'ongoing', label: t('filterOngoing'), dotClassName: 'bg-emerald-500' },
    { value: 'ended', label: t('filterEnded'), dotClassName: 'bg-[var(--muted-foreground)]' },
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
            placeholder={t('searchPlaceholder')}
            className="w-full bg-transparent border border-[var(--border)] px-4 py-2.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] font-mono transition-colors"
          />
        </div>

        {/* 状态筛选 */}
        <div className="flex-shrink-0">
          <FilterBar
            options={statusOptions}
            value={statusFilter}
            onChange={(v) => onStatusChange(v as StatusFilter)}
            label="Status"
          />
        </div>
      </div>
    </div>
  );
}
