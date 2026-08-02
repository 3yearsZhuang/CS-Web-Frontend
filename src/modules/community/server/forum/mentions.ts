/**
 * @file 提及服务（已迁移至 Repository 抽象层，ADR-009）
 *
 * 解析文本中的 @用户名 提及，并写入 community_mentions 表 + 触发通知。
 */
import crypto from 'node:crypto';
import { getCommunityRepository } from '@/shared/db/repositories/community.repo';
import { createNotification } from '@/modules/notification/server/notification-core';
import { getDisplayNamesByIds } from '../shared';
import type { DbEngine } from '@/shared/db/drivers';

export interface MentionTarget {
  userId: string;
  displayName: string;
}

/** 从文本中提取 @用户名（匹配 display_name，大小写不敏感） */
export async function resolveMentionedUsers(content: string): Promise<MentionTarget[]> {
  const repo = getCommunityRepository();
  const matches = content.match(/@([^\s@，。！？、,#]+)/g);
  if (!matches || matches.length === 0) return [];

  const names = matches.map((m) => m.slice(1));
  const users = await repo.findUsersByDisplayNames(names);
  const unique = new Map<string, MentionTarget>();
  for (const u of users) {
    if (!unique.has(u.id)) unique.set(u.id, { userId: u.id, displayName: u.display_name });
  }
  return [...unique.values()];
}

/** 向被提及用户写入 community_mentions + 发送通知 */
export async function notifyMentionedUsers(
  targets: MentionTarget[],
  sourceType: 'topic' | 'post' | 'reply',
  sourceId: string,
  sourceAuthorId: string,
): Promise<void> {
  if (targets.length === 0) return;
  const repo = getCommunityRepository();
  for (const t of targets) {
    if (t.userId === sourceAuthorId) continue;
    const id = crypto.randomUUID();
    await repo.insertMention(id, t.userId, sourceType, sourceId, sourceAuthorId);
    await createNotification(
      t.userId,
      'activity',
      '有人提到了你',
      `${sourceType === 'reply' ? '回复' : sourceType === 'post' ? '文章' : '话题'}中提到了你`,
      sourceId,
    );
  }
}

/** 兼容旧调用：仅解析（同步包装） */
export async function getMentionTargets(content: string): Promise<MentionTarget[]> {
  return resolveMentionedUsers(content);
}

/** 扫描文本并向被提及用户发送通知（解析 + 通知） */
export async function scanMentions(
  content: string,
  sourceType: 'topic' | 'post' | 'reply',
  sourceId: string,
  sourceAuthorId: string,
): Promise<void> {
  const targets = await resolveMentionedUsers(content);
  await notifyMentionedUsers(targets, sourceType, sourceId, sourceAuthorId);
}

export { getDisplayNamesByIds };
