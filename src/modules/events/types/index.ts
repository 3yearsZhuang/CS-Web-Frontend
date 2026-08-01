/**
 * @file 活动模块 — 共享类型
 */

/** 活动状态 */
export type EventStatus = 'upcoming' | 'ongoing' | 'ended';

/** 活动数据库行 */
export interface EventRow {
  id: string;
  month: string | null;
  date: string | null;
  title: string;
  description: string | null;
  status: string | null;
  year: string | null;
  topics: string | null;
  tags: string | null;
  is_pinned: number;
  capacity: number;
  content_markdown: string | null;
  registration_fields: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** 自定义报名字段 */
export interface RegistrationField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox';
  required: boolean;
  options?: string[];
}

/** 活动展示对象 */
export interface EventItem {
  id: string;
  month: string | null;
  date: string | null;
  title: string;
  description: string | null;
  status: EventStatus | null;
  year: string | null;
  topics: string[];
  tags: string[];
  isPinned: boolean;
  capacity: number;
  contentMarkdown: string | null;
  registrationFields: RegistrationField[];
  createdBy: string | null;
  registeredCount?: number;
  createdAt: string;
  updatedAt: string;
}

/** 活动创建/更新输入 */
export interface EventInput {
  month?: string | null;
  date?: string | null;
  title: string;
  description?: string | null;
  status?: EventStatus | null;
  year?: string | null;
  topics?: string[];
  tags?: string[];
  isPinned?: boolean;
  capacity?: number;
  contentMarkdown?: string | null;
  registrationFields?: RegistrationField[];
}

/** 报名状态 */
export type RegistrationStatus = 'registered' | 'cancelled' | 'waitlisted';

/** 报名记录对象 */
export interface EventRegistration {
  id: string;
  userId: string;
  eventId: string;
  status: RegistrationStatus;
  formData: Record<string, string> | null;
  registeredAt: string;
  cancelledAt: string | null;
}

/** 报名记录数据库行 */
export interface EventRegistrationRow {
  id: string;
  user_id: string;
  event_id: string;
  status: string;
  form_data: string | null;
  registered_at: string;
  cancelled_at: string | null;
}

/** 分页活动列表 */
export interface PaginatedEvents {
  events: EventItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** 活动列表筛选条件 */
export interface ListEventsFilters {
  status?: EventStatus | null;
  search?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
}

/** 活动字段长度限制 */
export const EVENT_LIMITS = {
  MONTH_MAX: 8,
  DATE_MAX: 32,
  TITLE_MAX: 120,
  DESC_MAX: 500,
  YEAR_MAX: 8,
  TAG_MAX: 40,
  TAGS_MAX: 10,
  CONTENT_MAX: 10000,
} as const;

/** 签到记录对象 */
export interface EventCheckin {
  id: string;
  eventId: string;
  registrationId: string | null;
  userId: string | null;
  checkinCode: string;
  checkedInAt: string | null;
  checkedInBy: string | null;
  createdAt: string;
}

/** 签到记录数据库行 */
export interface EventCheckinRow {
  id: string;
  event_id: string;
  registration_id: string | null;
  user_id: string | null;
  checkin_code: string;
  checked_in_at: string | null;
  checked_in_by: string | null;
  created_at: string;
}

/** 签到码信息 */
export interface CheckinCode {
  code: string;
  userId: string;
  registrationId: string;
}