/**
 * @file 管理员工具集 — 类型、常量与展示工具函数（从 admin-tools-panel 拆出，GENERAL 2.4）
 */

export type ToolSubView = 'resources' | 'exams' | 'tasks';

export const TASK_CATEGORY_LABELS: Record<string, string> = {
  general: '通用',
  documentation: '文档贡献',
  event: '活动协助',
  maintenance: '项目维护',
  mentoring: '新人指导',
  other: '其他',
};

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

export interface Task {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  points: number;
  maxClaimants: number;
  status: string;
  createdBy: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  claimCount: number;
}

export interface TaskClaim {
  id: string;
  taskId: string;
  userId: string;
  status: string;
  claimNote: string | null;
  displayName: string | null;
  createdAt: string;
}

export const RESOURCE_PAGE_SIZE = 10;
export const EXAM_PAGE_SIZE = 10;
export const TASK_PAGE_SIZE = 10;

/** 格式化 ISO 时间为 yyyy-MM-dd HH:mm */
export function formatDate(iso: string): string {
  const d = new Date(iso + 'Z');
  if (isNaN(d.getTime())) return '—';
  return d.toISOString().slice(0, 16).replace('T', ' ');
}
