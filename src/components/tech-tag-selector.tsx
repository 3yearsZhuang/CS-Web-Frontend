'use client'
/**
 * @file 技术标签选择器组件
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTranslations } from 'next-intl';
import { EASE } from '@/shared/utils/ui-constants';
import { TECH_TAGS, TECH_TAGS_MAX } from '@/shared/utils/tech-tags';

/** TechTagSelector 组件 Props */
interface TechTagSelectorProps {
  selected: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

/** 技术方向标签选择器 — 多选 Chip 组件 */
export function TechTagSelector({ selected, onChange, disabled }: TechTagSelectorProps) {
  const [expanded, setExpanded] = useState(false);
  const t = useTranslations('techTag');

  const toggle = useCallback(
    (key: string) => {
      if (disabled) return;
      if (selected.includes(key)) {
        onChange(selected.filter((k) => k !== key));
      } else if (selected.length < TECH_TAGS_MAX) {
        onChange([...selected, key]);
      }
    },
    [selected, onChange, disabled],
  );

  const selectedLabels = TECH_TAGS.filter((t) => selected.includes(t.key));

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between group focus-amber"
      >
        <div className="meta-mono text-[var(--muted-foreground)] flex items-center gap-3">
          <span>[ 05 ] Tech Tags</span>
          <span className="text-[11px] text-[var(--muted-foreground)]/60">
            {selected.length}/{TECH_TAGS_MAX}
          </span>
          {!expanded && selected.length > 0 && (
            <span className="text-[var(--primary)] text-[11px] truncate max-w-[200px]">
              {selectedLabels.map((t) => t.label).join(', ')}
            </span>
          )}
          {!expanded && selected.length === 0 && (
            <span className="text-[var(--muted-foreground)]/40">—</span>
          )}
        </div>
        <span
          className={`meta-mono text-[11px] text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-all duration-300 ${
            expanded ? 'rotate-180' : ''
          }`}
        >
          ▼
        </span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TECH_TAGS.map((tag) => {
                const isSelected = selected.includes(tag.key);
                const isFull = selected.length >= TECH_TAGS_MAX && !isSelected;
                return (
                  <button
                    key={tag.key}
                    type="button"
                    disabled={disabled || isFull}
                    onClick={() => toggle(tag.key)}
                    title={tag.description}
                    className={`text-left px-3 py-2.5 border text-[13px] transition-all ${
                      isSelected
                        ? 'border-[var(--primary)] bg-[var(--primary)]/[0.06] text-[var(--primary)]'
                        : isFull
                          ? 'border-[var(--border)] text-[var(--muted-foreground)]/30 cursor-not-allowed'
                          : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/40 hover:text-[var(--foreground)]'
                    }`}
                  >
                    <div className="font-mono text-[12px] leading-tight">
                      {tag.label}
                    </div>
                    <div className="text-[10px] mt-0.5 opacity-60 leading-tight">
                      {tag.description}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 meta-mono text-[10px] text-[var(--muted-foreground)]">
              {t('hint', { max: TECH_TAGS_MAX })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}