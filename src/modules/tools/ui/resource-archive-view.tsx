'use client';

/**
 * @file ResourceArchiveView — 资源站档案柜视图（/tools/resource?view=archive）
 *
 * 消费真实资源数据（BFF /api/tools/resource），按 resource_type 分组映射为
 * ArchiveEntry 后交给 Rhine 档案柜共享组件渲染。本视图为只读浏览：
 * 收藏走 localStorage 降级（后端暂无收藏端点），检索为已载入数据的前端过滤。
 *
 * 业务入口不丢失：顶部保留"提交资源"与"卡片视图"入口；
 * Rhine 令牌仅在 ?view=archive 分支挂载（FrontDoc-UID §17 白名单作用域）。
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArchiveIndex as RhineArchiveIndex } from '@/components/rhine/archive-index';
import type { ArchiveEntry, ArchiveGroup, ArchiveLabels } from '@/components/rhine/archive-model';
import { apiRequest } from '@/shared/hooks/use-api-request';
import type { ResourceWithAuthor } from '@/modules/tools/types';
import { resourceTypeLabel, type ResourceListData } from './hooks/use-resources';

/** 单次载入量（档案柜为整册浏览，不做分页） */
const PAGE_SIZE = 100;
/** 分类顺序与编号前缀 */
const TYPE_ORDER = [
  ['article', 'A'],
  ['video', 'V'],
  ['course', 'C'],
  ['tool', 'T'],
  ['book', 'B'],
  ['other', 'X'],
] as const;

export function ResourceArchiveView() {
  const t = useTranslations('toolsResource');
  const [data, setData] = useState<ResourceListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await apiRequest<ResourceListData>(
          `/api/tools/resource?sort=latest&page=1&pageSize=${PAGE_SIZE}`,
        );
        if (cancelled) return;
        if (r.ok) setData(r.data ?? null);
        else setError(r.error ?? 'networkError');
      } catch {
        if (!cancelled) setError('networkError');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo<ArchiveGroup[]>(() => {
    const rows = (data?.resources ?? []) as ResourceWithAuthor[];
    return TYPE_ORDER.map(([type, prefix]) => {
      const matched = rows.filter((r) => r.resource_type === type);
      return {
        key: prefix,
        name: resourceTypeLabel(t, type),
        en: type.toUpperCase(),
        items: matched.map((r, i) => toEntry(r, prefix, i)),
      };
    });
  }, [data, t]);

  const labels = useMemo<Partial<ArchiveLabels>>(
    () => ({
      headerCrumb: t('archiveCrumb'),
      backHref: '/tools/resource',
      backLabel: t('archiveBack'),
      empty: t('empty'),
      placeholder: t('archivePlaceholder'),
    }),
    [t],
  );

  if (loading) {
    return (
      <div
        className="rhine-scope flex flex-1 items-center justify-center"
        style={{ background: 'var(--rhine-paper)', color: 'var(--rhine-ink-dim)', fontFamily: 'var(--rhine-mono)' }}
      >
        <span className="text-[11px] tracking-[0.2em]">{t('archiveLoading')}</span>
      </div>
    );
  }
  if (error) {
    return (
      <div
        className="rhine-scope flex flex-1 flex-col items-center justify-center gap-4"
        style={{ background: 'var(--rhine-paper)', color: 'var(--rhine-ink-dim)', fontFamily: 'var(--rhine-mono)' }}
      >
        <span className="text-[11px] tracking-[0.2em]">{t('archiveError')}</span>
        <Link href="/tools/resource" className="rhine-topbtn">← {t('archiveBack')}</Link>
      </div>
    );
  }

  return (
    <RhineArchiveIndex
      groups={groups}
      favsKey="fztbu-resource-archive-favs"
      labels={labels}
      headerExtra={
        <Link href="/tools/resource?submit=1" className="rhine-topbtn">
          + {t('submit')}
        </Link>
      }
    />
  );
}

/** 资源 → 档案条目 */
function toEntry(r: ResourceWithAuthor, prefix: string, i: number): ArchiveEntry {
  const tags = (r.tech_tags ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const date = (r.created_at ?? '').slice(0, 10);
  return {
    id: `${prefix}-${String(i + 1).padStart(3, '0')}`,
    title: r.title,
    owner: r.author_display_name ?? '—',
    tags,
    date,
    summary: r.description ?? '（暂无描述）',
    records: [
      [date, '资源提交并通过审核，进入公开档案。'],
      [(r.updated_at ?? '').slice(0, 10), '最近一次元数据更新。'],
      ['—', `浏览 ${r.view_count ?? 0} · 点赞 ${r.like_count ?? 0}`],
    ],
    meta: [
      `ARCHIVE_ID  = ${prefix}-${String(i + 1).padStart(3, '0')}`,
      `RESOURCE_ID = ${r.id}`,
      `TYPE        = ${r.resource_type}`,
      `TITLE       = ${r.title}`,
      `AUTHOR      = ${r.author_display_name ?? '—'}`,
      `TAGS        = ${tags.join(', ')}`,
      `VIEWS       = ${r.view_count ?? 0}`,
      `LIKES       = ${r.like_count ?? 0}`,
      `URL         = ${r.url}`,
      `CREATED_AT  = ${r.created_at ?? '—'}`,
    ].join('\n'),
    href: r.url,
  };
}
