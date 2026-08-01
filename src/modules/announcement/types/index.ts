/**
 * @file 公告模块 — 共享类型
 */

/** 公告级别 */
export type AnnouncementLevel = 'info' | 'warning' | 'success' | 'error';

/** 公告记录 */
export interface Announcement {
  id: string;
  title: string;
  content: string | null;
  level: AnnouncementLevel;
  isActive: boolean;
  isDismissible: boolean;
  priority: number;
  expiresAt: string | null;
  targetRoles: string[] | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

/** 公告创建/编辑输入 */
export interface AnnouncementInput {
  title: string;
  content?: string;
  level?: AnnouncementLevel;
  isDismissible?: boolean;
  priority?: number;
  expiresAt?: string | null;
  targetRoles?: string[] | null;
}

/** 分页公告列表 */
export interface PaginatedAnnouncements {
  items: Announcement[];
  total: number;
}