'use client';

/**
 * @file ResourceCard — 资源卡片（资源站列表子组件）
 *
 * 从 `app/tools/resource/page.tsx` 拆出（GENERAL 2.4「组件 > 500 行拆分」）。
 * 仅负责单条资源渲染；数据由父页面通过 props 注入。
 */

import { motion } from 'motion/react';
import { ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { TECH_TAGS } from '@/shared/utils/tech-tags';
import { EASE } from '@/shared/utils/ui-constants';
import type { ResourceItem } from './use-resources';
import { formatDate, typeLabelOf, typeIconOf } from './use-resources';

interface Props {
  resource: ResourceItem;
}

export function ResourceCard({ resource }: Props) {
  const t = useTranslations('toolsResource');
  const typeLabel = typeLabelOf(t, resource.resource_type);
  const typeIcon = typeIconOf(resource.resource_type);
  const tags: string[] = resource.tech_tags ? JSON.parse(resource.tech_tags) : [];

  return (
    <motion.a
      key={resource.id}
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: EASE },
        },
      }}
      className="block p-6 border border-[var(--border)] card-minimal hover:bg-[var(--primary)]/[0.03] group transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[var(--primary)]">{typeIcon}</span>
            <span className="meta-mono text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">
              {typeLabel}
            </span>
          </div>

          <h3 className="display-serif text-[18px] sm:text-[20px] text-[var(--foreground)] mb-1 group-hover:text-[var(--primary)] transition-colors line-clamp-2">
            {resource.title}
          </h3>

          {resource.description && (
            <p className="text-[13px] sm:text-[14px] text-[var(--muted-foreground)] leading-[1.6] mt-2 line-clamp-2">
              {resource.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {tags.slice(0, 3).map((tag, i) => (
              <span
                key={`${tag}-${i}`}
                className="meta-mono text-[10px] px-2 py-0.5 border border-[var(--border)] text-[var(--muted-foreground)]"
              >
                {TECH_TAGS.find((t) => t.key === tag)?.label ?? tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="meta-mono text-[10px] text-[var(--muted-foreground)]">+{tags.length - 3}</span>
            )}
          </div>
        </div>

        <ExternalLink className="w-4 h-4 text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
      </div>

      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[var(--border)] meta-mono text-[10px] text-[var(--muted-foreground)]">
        {resource.author_display_name && <span>{resource.author_display_name}</span>}
        <span>{formatDate(resource.created_at)}</span>
        <span>{t('viewsCount', { count: resource.view_count })}</span>
      </div>
    </motion.a>
  );
}
