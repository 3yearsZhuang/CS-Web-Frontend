/**
 * @file Agent 建议收件箱类型（AG-P3-01）——与后端 AgentInboxItemOut（TZModel camelCase）对齐。
 */

/** 建议类型（后端 INBOX_ITEM_TYPES 白名单的子集展示映射，未注册类型原样透出） */
export type AgentInboxType =
  | 'review_due'
  | 'resource_recommend'
  | 'goal_nudge'
  | 'community_digest'
  | 'system_hint'
  | (string & {});

/** 用户处理动作 */
export type InboxAction = 'accept' | 'dismiss' | 'snooze';

/** 建议项（后端 camelCase 出参） */
export interface AgentInboxItem {
  id: number;
  userId: number;
  type: AgentInboxType;
  source: string;
  title: string;
  reason: string | null;
  confidence: number | null;
  estimatedMinutes: number | null;
  payload: Record<string, unknown> | null;
  status: 'pending' | 'accepted' | 'dismissed' | 'snoozed' | 'expired';
  snoozedUntil: string | null;
  expiresAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
