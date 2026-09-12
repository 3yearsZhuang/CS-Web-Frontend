'use client';

/**
 * @file /lab/archive 适配器 — 演示编目数据 → Rhine 档案柜共享组件
 *
 * 视觉与交互全部由 `ArchiveIndex`（components/rhine）提供，本文件只做数据适配：
 * 演示编目（archive-data）→ ArchiveEntry，并注入会话级收藏键。
 */
import { useMemo } from 'react';
import { ArchiveIndex as RhineArchiveIndex } from '@/components/rhine/archive-index';
import type { ArchiveGroup } from '@/components/rhine/archive-model';
import { ARCHIVE_CATS, metaOf, recordsOf, summaryOf } from './archive-data';

/** 会话级收藏键（与资源站视图互不影响） */
const FAVS_KEY = 'fztbu-lab-archive-favs';

export function ArchiveIndex() {
  const groups: ArchiveGroup[] = useMemo(
    () =>
      ARCHIVE_CATS.map((c) => ({
        key: c.key,
        name: c.name,
        en: c.en,
        items: c.items.map((it) => ({
          id: it.id,
          title: it.title,
          en: it.en,
          owner: it.owner,
          tags: it.tags,
          date: it.date,
          summary: summaryOf(it),
          records: recordsOf(it),
          meta: metaOf(it),
        })),
      })),
    [],
  );

  return (
    <main className="rhine-scope flex h-screen flex-col pt-16">
      <RhineArchiveIndex groups={groups} favsKey={FAVS_KEY} />
    </main>
  );
}
