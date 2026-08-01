/**
 * @file 论坛服务层 — @ 提及扫描与通知（Markdown 解析 + 站内通知）
 */
import crypto from 'node:crypto';
import { getDb } from '@/shared/db';
import { appBus } from '@/shared/events/event-bus';
import {
  FORUM_LIMITS,
  MENTION_PATTERN,
} from './shared';

/**
 * 从 Markdown 内容中扫描 @ 提及的用户名
 *
 * 模式：@<非空白非 @ 字符>。返回去重后的用户名列表（保留大小写）。
 * 上限 FORUM_LIMITS.MENTIONS_MAX，超出截断。
 */
export function scanMentions(content: string): string[] {
  const matches = content.matchAll(MENTION_PATTERN);
  const set = new Set<string>();
  for (const m of matches) {
    const name = m[1].trim();
    if (name && !set.has(name)) set.add(name);
    if (set.size >= FORUM_LIMITS.MENTIONS_MAX) break;
  }
  return [...set];
}

/**
 * 扫描内容中的 @ 提及并发送通知
 *
 * 按 displayName 精确匹配（大小写敏感），不通知提及者自己。
 */
export function notifyMentionsForContent(
  content: string,
  sourceType: 'topic' | 'reply' | 'post' | 'comment',
  sourceId: string,
  sourceAuthorId: string,
): void {
  const names = scanMentions(content);
  if (names.length === 0) return;

  const db = getDb();
  const placeholders = names.map(() => '?').join(',');
  const rows = db
    .prepare(
      `SELECT id, display_name FROM users
       WHERE display_name IN (${placeholders}) AND is_active = 1`,
    )
    .all(...names) as Array<{ id: string; display_name: string }>;

  const mentionedUserIds: string[] = [];

  for (const user of rows) {
    // 不通知自己
    if (user.id === sourceAuthorId) continue;

    mentionedUserIds.push(user.id);

    // 写入提及记录（用于审计与统计）
    const mentionId = crypto.randomUUID();
    // 统一映射：topic→post，reply→comment
    const unifiedSourceType = sourceType === 'topic' ? 'post' : sourceType === 'reply' ? 'comment' : sourceType;
    db.prepare(
      `INSERT INTO community_mentions (id, mentioned_user_id, source_type, source_id, source_author_id, is_notified)
       VALUES (?, ?, ?, ?, ?, 1)`,
    ).run(mentionId, user.id, unifiedSourceType, sourceId, sourceAuthorId);
  }

  // 通过事件总线发送通知（通知模块订阅此事件）
  if (mentionedUserIds.length > 0) {
    appBus.emit('reply.created', {
      replyId: sourceId,
      topicId: sourceId,
      authorId: sourceAuthorId,
      contentMarkdown: content,
      mentionedUserIds,
    });
  }
}
