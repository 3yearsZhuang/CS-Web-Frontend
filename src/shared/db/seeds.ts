/**
 * @file 数据库种子数据 — 首次建表时插入默认数据（幂等）
 */
import crypto from 'node:crypto';
import type { Database as DB } from 'better-sqlite3';
import { SEED_EVENT_PLANS, SEED_EVENT_ARCHIVES } from './seed-events-data';

/** 首次创建 events 表时导入硬编码数据（幂等，仅空表执行） */
export function seedEventsIfEmpty(db: DB): void {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM events').get() as { cnt: number };
  if (count.cnt > 0) return;

  const insert = db.prepare(
    `INSERT INTO events (id, month, date, title, description, status, year, topics, tags, content_markdown)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  SEED_EVENT_PLANS.forEach((p) => {
    insert.run(
      crypto.randomUUID(), p.month, p.date, p.title, p.desc, p.status,
      null, JSON.stringify(p.topics), null, p.content,
    );
  });
  SEED_EVENT_ARCHIVES.forEach((a) => {
    insert.run(
      crypto.randomUUID(), null, a.date, a.title, a.desc, 'ended',
      a.year, null, JSON.stringify(a.tags), a.content,
    );
  });
}

/** 首次创建 forum_categories 表时插入 4 个默认版块（幂等，仅空表执行） */
export function seedForumCategoriesIfEmpty(db: DB): void {
  const count = db
    .prepare('SELECT COUNT(*) as cnt FROM forum_categories')
    .get() as { cnt: number };
  if (count.cnt > 0) return;

  const insert = db.prepare(
    `INSERT INTO forum_categories (id, slug, name, description, sort_order)
     VALUES (?, ?, ?, ?, ?)`,
  );

  const categories: Array<{ slug: string; name: string; description: string }> = [
    {
      slug: 'web',
      name: 'Web 开发',
      description: '前端、后端、全栈实践与前沿技术讨论',
    },
    {
      slug: 'algorithm',
      name: '算法与数据结构',
      description: '算法竞赛、刷题心得、数据结构深入',
    },
    {
      slug: 'opensource',
      name: '开源项目',
      description: '开源协作、PR 提交、项目维护经验',
    },
    {
      slug: 'hardware',
      name: '硬件与创客',
      description: '嵌入式、IoT、单片机、创客项目',
    },
  ];

  categories.forEach((c, i) => {
    insert.run(crypto.randomUUID(), c.slug, c.name, c.description, i);
  });
}
