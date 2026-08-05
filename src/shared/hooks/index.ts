/**
 * @file shared/hooks 统一导出 — 全局可复用客户端 hooks（均为 'use client'）
 */

export { useAuth } from './use-auth';
export { useDebounce } from './use-debounce';
export { useFocusTrap } from './use-focus-trap';
export type { UseFocusTrapOptions } from './use-focus-trap';
export { useCollapsingHero } from './use-collapsing-hero';
export { useTopicDetail } from './use-topic-detail';
export type { TopicDetailState } from './use-topic-detail';
export { useTopicActions } from './use-topic-actions';
export type { TopicActions } from './use-topic-actions';
export { useReplyActions } from './use-reply-actions';
export type { ReplyActions } from './use-reply-actions';
export { useBreakpoint } from './use-breakpoint';
export type { Breakpoint } from './use-breakpoint';
