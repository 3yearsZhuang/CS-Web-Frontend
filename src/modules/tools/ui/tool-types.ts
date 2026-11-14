/**
 * @file 管理员工具集 — 类型、常量与展示工具函数（从 admin-tools-panel 拆出，GENERAL 2.4）
 */

export type ToolSubView = 'resources' | 'exams' | 'tasks';

export { formatDateTime as formatDate } from '@/shared/utils';

export interface PendingResource {
  id: string;
  title: string;
  url: string;
  description: string | null;
  resource_type: string;
  tech_tags: string | null;
  file_url: string | null;
  status: string;
  submitted_by: string;
  author_display_name: string | null;
  author_avatar_url: string | null;
  author_tech_tags: string | null;
  created_at: string;
}

export interface Exam {
  id: string;
  title: string;
  description: string | null;
  status: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number;
  tech_tags: string | null;
  created_by: string;
  created_at: string;
}

export const RESOURCE_PAGE_SIZE = 10;
export const EXAM_PAGE_SIZE = 10;
