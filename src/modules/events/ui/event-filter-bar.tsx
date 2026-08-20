/**
 * @file 活动筛选栏 — 状态筛选（受控组件，移动端按钮横向滚动）
 * 注：搜索已聚合至顶栏全站搜索（2026-08-20），此处仅保留状态筛选。
 */
'use client';

import { useTranslations } from 'next-intl';
import { FilterBar, type FilterBarOption } from '@/components/primitives/filter-bar';

/** 活动状态筛选值 */
export type StatusFilter = '' | 'upcoming' | 'ongoing' | 'ended';

interface EventFilterBarProps {
  statusFilter: StatusFilter;
  onStatusChange: (value: StatusFilter) => void;
}

/**
 * 活动筛选栏组件
 *
 * 受控组件，提供状态筛选功能。
 * 状态按钮组使用 <FilterBar> 统一实现。
 */
export function EventFilterBar({
  statusFilter,
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
