/**
 * @file 论坛服务层 — 管理员审核（hide/restore/pin/feature/hardDelete，已迁移至 Repository）
 */
import { getCommunityRepository } from '@/shared/db/repositories/community.repo';
import { AppError } from '@/shared/app-error';
import { logAdminAction } from '@/shared/security/audit';
import { getDbEngine } from '@/shared/db/drivers';
import type { DbEngine } from '@/shared/db/drivers';

/** 管理员隐藏主题 */
export async function hideTopic(adminId: string, topicId: string, reason?: string): Promise<void> {
  const repo = getCommunityRepository();
  const existing = await repo.getTopicStatusCategory(topicId);
  if (!existing) throw new AppError('主题不存在', 'NOT_FOUND');
  if (existing.status === 'deleted') throw new AppError('主题已删除，无法隐藏', 'STATUS_CONFLICT');
  if (existing.status === 'hidden') return; // 幂等

  const engine = await getDbEngine();
  await engine.transaction(async (tx: DbEngine) => {
    await repo.updatePost(
      ["status = 'hidden'", 'hidden_by = ?', 'hidden_at = datetime(\'now\')', 'hidden_reason = ?', "updated_at = datetime('now')"],
      [adminId, reason ?? null],
      topicId,
      tx,
    );
    await repo.incrementCategoryPostCountByTopic(topicId, tx);
    // 反范式计数：版块 post_count - 1（隐藏不展示在公开列表）
    await tx.execute(
      'UPDATE community_categories SET post_count = MAX(post_count - 1, 0), updated_at = datetime(\'now\') WHERE id = ?',
      [existing.category_id],
    );
  });

  await logAdminAction(adminId, 'forum_hide_topic', topicId, { targetType: 'topic', reason });
}

/** 管理员恢复隐藏的主题 */
export async function restoreTopic(adminId: string, topicId: string): Promise<void> {
  const repo = getCommunityRepository();
  const existing = await repo.getTopicStatusCategory(topicId);
  if (!existing) throw new AppError('主题不存在', 'NOT_FOUND');
  if (existing.status === 'published') return;
  if (existing.status === 'deleted') throw new AppError('主题已删除，无法恢复', 'STATUS_CONFLICT');

  const engine = await getDbEngine();
  await engine.transaction(async (tx: DbEngine) => {
    await repo.updatePost(
      ["status = 'published'", 'hidden_by = NULL', 'hidden_at = NULL', 'hidden_reason = NULL', "updated_at = datetime('now')"],
      [],
      topicId,
      tx,
    );
    await tx.execute(
      'UPDATE community_categories SET post_count = post_count + 1, updated_at = datetime(\'now\') WHERE id = ?',
      [existing.category_id],
    );
  });

  await logAdminAction(adminId, 'forum_restore_topic', topicId, { targetType: 'topic' });
}

/** 管理员置顶/取消置顶 */
export async function setTopicPinned(adminId: string, topicId: string, pinned: boolean): Promise<void> {
  const repo = getCommunityRepository();
  const existing = await repo.getTopicStatusCategory(topicId);
  if (!existing) throw new AppError('主题不存在', 'NOT_FOUND');
  if (existing.status === 'deleted') throw new AppError('主题已删除', 'STATUS_CONFLICT');

  await repo.updatePost(["is_pinned = ?", "updated_at = datetime('now')"], [pinned ? 1 : 0], topicId);
  await logAdminAction(adminId, 'forum_pin_topic', topicId, { targetType: 'topic', pinned });
}

/** 管理员加精/取消加精 */
export async function setTopicFeatured(adminId: string, topicId: string, featured: boolean): Promise<void> {
  const repo = getCommunityRepository();
  const existing = await repo.getTopicStatusCategory(topicId);
  if (!existing) throw new AppError('主题不存在', 'NOT_FOUND');
  if (existing.status === 'deleted') throw new AppError('主题已删除', 'STATUS_CONFLICT');

  await repo.updatePost(["is_featured = ?", "updated_at = datetime('now')"], [featured ? 1 : 0], topicId);
  await logAdminAction(adminId, 'forum_feature_topic', topicId, { targetType: 'topic', featured });
}

/**
 * 管理员硬删除主题（不可恢复）
 */
export async function hardDeleteTopic(adminId: string, topicId: string): Promise<void> {
  const repo = getCommunityRepository();
  const existing = await repo.getPostForModeration(topicId);
  if (!existing) throw new AppError('主题不存在', 'NOT_FOUND');

  const engine = await getDbEngine();
  await engine.transaction(async (tx: DbEngine) => {
    await tx.execute('DELETE FROM community_posts WHERE id = ?', [topicId]);
    if (existing.status === 'published' || existing.status === 'hidden') {
      await tx.execute(
        'UPDATE community_categories SET post_count = MAX(post_count - 1, 0), updated_at = datetime(\'now\') WHERE id = ?',
        [existing.category_id],
      );
    }
  });

  await logAdminAction(adminId, 'forum_hard_delete_topic', topicId, { targetType: 'topic', title: existing.title });
}

/** 管理员隐藏回复 */
export async function hideReply(adminId: string, replyId: string, reason?: string): Promise<void> {
  const repo = getCommunityRepository();
  const existing = await repo.getCommentForModeration(replyId);
  if (!existing) throw new AppError('回复不存在', 'NOT_FOUND');
  if (existing.status === 'deleted') throw new AppError('回复已删除，无法隐藏', 'STATUS_CONFLICT');
  if (existing.status === 'hidden') return;

  const engine = await getDbEngine();
  await engine.transaction(async (tx: DbEngine) => {
    await repo.markCommentHidden(replyId, tx);
    if (existing.status === 'published') {
      await repo.decrementCommentCounts(existing.parent_comment_id, existing.post_id, tx);
      await repo.decrementCategoryPostCountByTopic(existing.post_id, tx);
      if (existing.parent_comment_id) {
        await tx.execute(
          'UPDATE community_comments SET reply_count = MAX(reply_count - 1, 0) WHERE id = ?',
          [existing.parent_comment_id],
        );
      }
    }
  });

  await logAdminAction(adminId, 'forum_hide_reply', replyId, { targetType: 'reply', reason });
}

/** 管理员恢复隐藏的回复 */
export async function restoreReply(adminId: string, replyId: string): Promise<void> {
  const repo = getCommunityRepository();
  const existing = await repo.getCommentForModeration(replyId);
  if (!existing) throw new AppError('回复不存在', 'NOT_FOUND');
  if (existing.status === 'published') return;
  if (existing.status === 'deleted') throw new AppError('回复已删除，无法恢复', 'STATUS_CONFLICT');

  const engine = await getDbEngine();
  await engine.transaction(async (tx: DbEngine) => {
    await repo.restoreComment(replyId, tx);
    await repo.restoreCommentCounts(existing.parent_comment_id, existing.post_id, tx);
    await repo.incrementCategoryPostCountByTopic(existing.post_id, tx);
    if (existing.parent_comment_id) {
      await tx.execute(
        'UPDATE community_comments SET reply_count = reply_count + 1 WHERE id = ?',
        [existing.parent_comment_id],
      );
    }
  });

  await logAdminAction(adminId, 'forum_restore_reply', replyId, { targetType: 'reply' });
}

/**
 * 管理员硬删除回复
 */
export async function hardDeleteReply(adminId: string, replyId: string): Promise<void> {
  const repo = getCommunityRepository();
  const existing = await repo.getCommentTopicParent(replyId);
  if (!existing) throw new AppError('回复不存在', 'NOT_FOUND');

  const engine = await getDbEngine();
  await engine.transaction(async (tx: DbEngine) => {
    await tx.execute('DELETE FROM community_comments WHERE id = ?', [replyId]);
    if (existing.status === 'published' || existing.status === 'hidden') {
      await repo.decrementCommentCounts(existing.parent_comment_id, existing.post_id, tx);
      await repo.decrementCategoryPostCountByTopic(existing.post_id, tx);
      if (existing.parent_comment_id) {
        await tx.execute(
          'UPDATE community_comments SET reply_count = MAX(reply_count - 1, 0) WHERE id = ?',
          [existing.parent_comment_id],
        );
      }
    }
  });

  await logAdminAction(adminId, 'forum_hard_delete_reply', replyId, { targetType: 'reply' });
}
