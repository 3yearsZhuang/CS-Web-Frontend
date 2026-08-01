/**
 * @file 论坛服务层 — 用户主页数据（个人主页 Profile > Forum 标签页）
 */
import { getDb } from '@/shared/db';
import {
  FORUM_LIMITS,
  computePagination,
  computeTotalPages,
  loadCategorySummaries,
} from './shared';
import {
  listTopics,
  type PaginatedPosts,
} from './topics';
import {
  buildReplyDetails,
} from './replies';
import type { PaginatedComments } from '../../types';

/** 列出某用户发布的主题（公开） */
export function listUserTopics(
  userId: string,
  page: number = 1,
  pageSize: number = FORUM_LIMITS.TOPICS_PAGE_SIZE,
): PaginatedPosts {
  return listTopics({ authorId: userId, page, pageSize });
}

/** 列出某用户的回复（公开） */
export function listUserReplies(
  userId: string,
  page: number = 1,
  pageSize: number = FORUM_LIMITS.REPLIES_PAGE_SIZE,
): PaginatedComments {
  const db = getDb();
  const { page: safePage, pageSize: safePageSize, offset } = computePagination({
    page,
    pageSize,
    defaultPageSize: FORUM_LIMITS.REPLIES_PAGE_SIZE,
    maxPageSize: 100,
  });

  const where = "author_id = ? AND status = 'published'";
  const totalRow = db
    .prepare(`SELECT COUNT(*) as count FROM community_comments WHERE ${where}`)
    .get(userId) as { count: number };
  const total = totalRow.count;
  const totalPages = computeTotalPages(total, safePageSize);

  const rows = db
    .prepare(
      `SELECT * FROM community_comments WHERE ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    )
    .all(userId, safePageSize, offset) as import('./shared').CommentRow[];

  const result = buildReplyDetails(rows, undefined, total, safePage, safePageSize, totalPages);

  // 批量加载回复所属主题的摘要（id / title / category slug+name）— 用于个人主页展示回复所属主题
  if (result.items.length > 0) {
    const topicIds = [...new Set(result.items.map((r) => r.topicId))].filter(Boolean);
    const topicMap = new Map<
      string,
      { id: string; title: string; categoryId: string }
    >();
    if (topicIds.length > 0) {
      const placeholders = topicIds.map(() => '?').join(',');
      const topicRows = db
        .prepare(
          `SELECT id, title, category_id FROM community_posts WHERE id IN (${placeholders}) AND kind = 'topic'`,
        )
        .all(...topicIds) as Array<{
          id: string;
          title: string;
          category_id: string;
        }>;
      for (const t of topicRows) {
        topicMap.set(t.id, {
          id: t.id,
          title: t.title,
          categoryId: t.category_id,
        });
      }
    }
    // 批量加载版块摘要
    const categoryIds = [
      ...new Set([...topicMap.values()].map((t) => t.categoryId)),
    ].filter(Boolean);
    const categoryMap = loadCategorySummaries(categoryIds);

    // 为每条回复附加 topic 摘要
    result.items = result.items.map((reply) => {
      const t = topicMap.get(reply.topicId ?? '');
      if (!t) return reply;
      const cat = categoryMap.get(t.categoryId) ?? null;
      return {
        ...reply,
        topic: {
          id: t.id,
          title: t.title,
          category: cat ? { slug: cat.slug, name: cat.name } : null,
        },
      };
    });
  }

  return result;
}
