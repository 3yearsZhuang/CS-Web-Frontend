/**
 * @file 论坛服务层 — 管理员审核（hide/restore/pin/feature/hardDelete）
 */
import { getDb } from '@/shared/db';
import { AppError } from '@/shared/app-error';
import { logAdminAction } from '@/shared/security/audit';

/** 管理员隐藏主题 */
export function hideTopic(adminId: string, topicId: string, reason?: string): void {
  const db = getDb();
  const existing = db
    .prepare('SELECT id, status, category_id FROM community_posts WHERE id = ?')
    .get(topicId) as
    | { id: string; status: string; category_id: string }
    | undefined;
  if (!existing) {
    throw new AppError('主题不存在', 'NOT_FOUND');
  }
  if (existing.status === 'deleted') {
    throw new AppError('主题已删除，无法隐藏', 'STATUS_CONFLICT');
  }
  if (existing.status === 'hidden') return; // 幂等

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE community_posts
       SET status = 'hidden', hidden_by = ?, hidden_at = datetime('now'), hidden_reason = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
    ).run(adminId, reason ?? null, topicId);
    // 反范式计数：版块 post_count - 1（隐藏不展示在公开列表）
    db.prepare(
      'UPDATE community_categories SET post_count = MAX(post_count - 1, 0), updated_at = datetime(\'now\') WHERE id = ?',
    ).run(existing.category_id);
  });
  tx();

  logAdminAction(adminId, 'forum_hide_topic', null, { topicId, reason });
}

/** 管理员恢复隐藏的主题 */
export function restoreTopic(adminId: string, topicId: string): void {
  const db = getDb();
  const existing = db
    .prepare('SELECT id, status, category_id FROM community_posts WHERE id = ?')
    .get(topicId) as
    | { id: string; status: string; category_id: string }
    | undefined;
  if (!existing) {
    throw new AppError('主题不存在', 'NOT_FOUND');
  }
  if (existing.status === 'published') return;
  if (existing.status === 'deleted') {
    throw new AppError('主题已删除，无法恢复', 'STATUS_CONFLICT');
  }

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE community_posts
       SET status = 'published', hidden_by = NULL, hidden_at = NULL, hidden_reason = NULL,
           updated_at = datetime('now')
       WHERE id = ?`,
    ).run(topicId);
    db.prepare(
      'UPDATE community_categories SET post_count = post_count + 1, updated_at = datetime(\'now\') WHERE id = ?',
    ).run(existing.category_id);
  });
  tx();

  logAdminAction(adminId, 'forum_restore_topic', null, { topicId });
}

/** 管理员置顶/取消置顶 */
export function setTopicPinned(adminId: string, topicId: string, pinned: boolean): void {
  const db = getDb();
  const existing = db
    .prepare('SELECT id, status FROM community_posts WHERE id = ?')
    .get(topicId) as { id: string; status: string } | undefined;
  if (!existing) {
    throw new AppError('主题不存在', 'NOT_FOUND');
  }
  if (existing.status === 'deleted') {
    throw new AppError('主题已删除', 'STATUS_CONFLICT');
  }

  db.prepare(
    "UPDATE community_posts SET is_pinned = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(pinned ? 1 : 0, topicId);

  logAdminAction(adminId, 'forum_pin_topic', null, { topicId, pinned });
}

/** 管理员加精/取消加精 */
export function setTopicFeatured(adminId: string, topicId: string, featured: boolean): void {
  const db = getDb();
  const existing = db
    .prepare('SELECT id, status FROM community_posts WHERE id = ?')
    .get(topicId) as { id: string; status: string } | undefined;
  if (!existing) {
    throw new AppError('主题不存在', 'NOT_FOUND');
  }
  if (existing.status === 'deleted') {
    throw new AppError('主题已删除', 'STATUS_CONFLICT');
  }

  db.prepare(
    "UPDATE community_posts SET is_featured = ?, updated_at = datetime('now') WHERE id = ?",
  ).run(featured ? 1 : 0, topicId);

  logAdminAction(adminId, 'forum_feature_topic', null, { topicId, featured });
}

/**
 * 管理员硬删除主题（不可恢复）
 *
 * 审计日志保留（admin_actions.admin_id 为 SET NULL，删除管理员后审计记录仍在）。
 * 关联数据通过 FK ON DELETE CASCADE 自动清理：回复、点赞、收藏、浏览记录、提及。
 */
export function hardDeleteTopic(adminId: string, topicId: string): void {
  const db = getDb();
  const existing = db
    .prepare('SELECT id, title, status, category_id FROM community_posts WHERE id = ?')
    .get(topicId) as
    | { id: string; title: string; status: string; category_id: string }
    | undefined;
  if (!existing) {
    throw new AppError('主题不存在', 'NOT_FOUND');
  }

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM community_posts WHERE id = ?').run(topicId);
    // 反范式计数：仅当原状态为 published/hidden 时回退（已 deleted 的不计入版块计数）
    if (existing.status === 'published' || existing.status === 'hidden') {
      db.prepare(
        'UPDATE community_categories SET post_count = MAX(post_count - 1, 0), updated_at = datetime(\'now\') WHERE id = ?',
      ).run(existing.category_id);
    }
  });
  tx();

  logAdminAction(adminId, 'forum_hard_delete_topic', null, {
    topicId,
    title: existing.title,
  });
}

/** 管理员隐藏回复 */
export function hideReply(adminId: string, replyId: string, reason?: string): void {
  const db = getDb();
  const existing = db
    .prepare('SELECT id, status, topic_id, parent_reply_id FROM community_comments WHERE id = ?')
    .get(replyId) as
    | { id: string; status: string; topic_id: string; parent_reply_id: string | null }
    | undefined;
  if (!existing) {
    throw new AppError('回复不存在', 'NOT_FOUND');
  }
  if (existing.status === 'deleted') {
    throw new AppError('回复已删除，无法隐藏', 'STATUS_CONFLICT');
  }
  if (existing.status === 'hidden') return;

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE community_comments
       SET status = 'hidden', hidden_by = ?, hidden_at = datetime('now'), hidden_reason = ?,
           updated_at = datetime('now')
       WHERE id = ?`,
    ).run(adminId, reason ?? null, replyId);
    // 反范式计数回退（隐藏不展示）
    if (existing.status === 'published') {
      db.prepare(
        'UPDATE community_posts SET reply_count = MAX(reply_count - 1, 0) WHERE id = ?',
      ).run(existing.topic_id);
      db.prepare(
        `UPDATE community_categories
         SET post_count = MAX(post_count - 1, 0), updated_at = datetime('now')
         WHERE id = (SELECT category_id FROM community_posts WHERE id = ?)`,
      ).run(existing.topic_id);
      if (existing.parent_reply_id) {
        db.prepare(
          'UPDATE community_comments SET reply_count = MAX(reply_count - 1, 0) WHERE id = ?',
        ).run(existing.parent_reply_id);
      }
    }
  });
  tx();

  logAdminAction(adminId, 'forum_hide_reply', null, { replyId, reason });
}

/** 管理员恢复隐藏的回复 */
export function restoreReply(adminId: string, replyId: string): void {
  const db = getDb();
  const existing = db
    .prepare('SELECT id, status, topic_id, parent_reply_id FROM community_comments WHERE id = ?')
    .get(replyId) as
    | { id: string; status: string; topic_id: string; parent_reply_id: string | null }
    | undefined;
  if (!existing) {
    throw new AppError('回复不存在', 'NOT_FOUND');
  }
  if (existing.status === 'published') return;
  if (existing.status === 'deleted') {
    throw new AppError('回复已删除，无法恢复', 'STATUS_CONFLICT');
  }

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE community_comments
       SET status = 'published', hidden_by = NULL, hidden_at = NULL, hidden_reason = NULL,
           updated_at = datetime('now')
       WHERE id = ?`,
    ).run(replyId);
    db.prepare(
      'UPDATE community_posts SET reply_count = reply_count + 1 WHERE id = ?',
    ).run(existing.topic_id);
    db.prepare(
      `UPDATE community_categories
       SET post_count = post_count + 1, updated_at = datetime('now')
       WHERE id = (SELECT category_id FROM community_posts WHERE id = ?)`,
    ).run(existing.topic_id);
    if (existing.parent_reply_id) {
      db.prepare(
        'UPDATE community_comments SET reply_count = reply_count + 1 WHERE id = ?',
      ).run(existing.parent_reply_id);
    }
  });
  tx();

  logAdminAction(adminId, 'forum_restore_reply', null, { replyId });
}

/**
 * 管理员硬删除回复
 *
 * 关联数据通过 FK ON DELETE CASCADE 自动清理：楼中楼、点赞、提及。
 */
export function hardDeleteReply(adminId: string, replyId: string): void {
  const db = getDb();
  const existing = db
    .prepare(
      'SELECT id, topic_id, parent_reply_id, status FROM community_comments WHERE id = ?',
    )
    .get(replyId) as
    | { id: string; topic_id: string; parent_reply_id: string | null; status: string }
    | undefined;
  if (!existing) {
    throw new AppError('回复不存在', 'NOT_FOUND');
  }

  const tx = db.transaction(() => {
    db.prepare('DELETE FROM community_comments WHERE id = ?').run(replyId);
    // 反范式计数回退（仅 published/hidden 状态才在计数中）
    if (existing.status === 'published' || existing.status === 'hidden') {
      db.prepare(
        'UPDATE community_posts SET reply_count = MAX(reply_count - 1, 0) WHERE id = ?',
      ).run(existing.topic_id);
      db.prepare(
        `UPDATE community_categories
         SET post_count = MAX(post_count - 1, 0), updated_at = datetime('now')
         WHERE id = (SELECT category_id FROM community_posts WHERE id = ?)`,
      ).run(existing.topic_id);
      if (existing.parent_reply_id) {
        db.prepare(
          'UPDATE community_comments SET reply_count = MAX(reply_count - 1, 0) WHERE id = ?',
        ).run(existing.parent_reply_id);
      }
    }
  });
  tx();

  logAdminAction(adminId, 'forum_hard_delete_reply', null, { replyId });
}
