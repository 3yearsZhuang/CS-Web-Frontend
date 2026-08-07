/**
 * @file i18n 消息结构类型 — 统一 key 定义（GENERAL 3.2）
 */

import type { CommonMessages } from './messages/common';
import type { CommunityMessages } from './messages/community';
import type { EventsMessages } from './messages/events';
import type { ToolsMessages } from './messages/tools';
import type { AdminMessages } from './messages/admin';
import type { UserMessages } from './messages/user';

export type Language = 'zh-CN' | 'en';

/** 聚合所有业务模块的消息结构 */
export type AppMessages = CommonMessages & CommunityMessages & EventsMessages & ToolsMessages & AdminMessages & UserMessages;

export type MessageKey = {
  [K in keyof AppMessages]: AppMessages[K] extends Record<string, unknown>
    ? `${K}.${Extract<keyof AppMessages[K], string>}`
    : never;
}[keyof AppMessages];

/** nav 命名空间下键类型：如 `about`、`brand` */
export type NavMessageKey = Extract<keyof AppMessages['nav'], string>;
