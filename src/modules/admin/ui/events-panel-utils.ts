/**
 * @file 管理员活动管理 — 类型、常量与展示工具函数（从 admin-events-panel 拆出，GENERAL 2.4）
 */

import type { EventForm, EventItem } from '@/modules/admin/ui/types';

export type EventModal =
  | { type: 'none' }
  | { type: 'eventCreate' }
  | { type: 'eventEdit'; event: EventItem }
  | { type: 'eventDelete'; event: EventItem }
  | { type: 'eventRegistrations'; event: EventItem };

export interface EventStat {
  eventId: string;
  title: string;
  capacity: number;
  total: number;
  registered: number;
  cancelled: number;
  waitlisted: number;
}

export function eventStatusLabel(s: EventItem['status']): string {
  return s === 'upcoming' ? '即将开始' : s === 'ongoing' ? '进行中' : s === 'ended' ? '已结束' : '—';
}

export function blankEventForm(): EventForm {
  return {
    month: '',
    date: '',
    title: '',
    description: '',
    status: '',
    year: '',
    topicsStr: '',
    tagsStr: '',
    isPinned: false,
    capacity: 0,
    contentMarkdown: '',
  };
}

export function eventToForm(e: EventItem): EventForm {
  return {
    month: e.month ?? '',
    date: e.date ?? '',
    title: e.title,
    description: e.description ?? '',
    status: e.status ?? '',
    year: e.year ?? '',
    topicsStr: e.topics.join(', '),
    tagsStr: e.tags.join(', '),
    isPinned: e.isPinned,
    capacity: e.capacity ?? 0,
    contentMarkdown: e.contentMarkdown ?? '',
    registrationFields: e.registrationFields ?? [],
  };
}

export function splitTags(s: string): string[] {
  return Array.from(
    new Set(
      s
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  );
}
