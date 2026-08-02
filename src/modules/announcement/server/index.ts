/**
 * @file 全站公告服务层 — 管理员管理，前端通过 API 获取生效公告
 */
import crypto from 'node:crypto';
import 'server-only';
import { getDbEngine } from '@/shared/db/drivers';
import { getAnnouncementRepository } from '@/shared/db/repositories';
import type {
  Announcement,
  AnnouncementInput,
  AnnouncementLevel,
  PaginatedAnnouncements,
} from '../types';

export type { Announcement, AnnouncementInput, AnnouncementLevel, PaginatedAnnouncements };

interface AnnouncementRow {
  id: string;
  title: string;
  content: string | null;
  level: string;
  is_active: number;
  is_dismissible: number;
  priority: number;
  expires_at: string | null;
  target_roles: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

function rowToAnnouncement(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    level: row.level as AnnouncementLevel,
    isActive: row.is_active === 1,
    isDismissible: row.is_dismissible === 1,
    priority: row.priority,
    expiresAt: row.expires_at,
    targetRoles: row.target_roles ? JSON.parse(row.target_roles) : null,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * 获取当前生效的公告（前端展示用）
 *
 * 日期格式兼容（R17 / ADR-016 同类修复）：expires_at 可能以 ISO 8601
 * （`YYYY-MM-DDThh:mm:ss.sssZ`，T 分隔符）或 SQLite datetime
 * （`YYYY-MM-DD hh:mm:ss`，空格分隔符）格式存储。直接做字符串比较时
 * `T`(0x54) > 空格(0x20)，导致 ISO 格式的过期公告在过期当天被判为未过期。
 * 用 datetime(expires_at) 归一化为 SQLite 格式后再比较。
 */
export async function getActiveAnnouncements(userRole?: string): Promise<Announcement[]> {
  const repo = getAnnouncementRepository();
  const rows = await repo.listActive();

  return rows
    .map(rowToAnnouncement)
    .filter((a) => {
      if (!a.targetRoles || a.targetRoles.length === 0) return true;
      if (!userRole) return false;
      return a.targetRoles.includes(userRole);
    });
}

/** 管理员：列出所有公告 */
export async function listAllAnnouncements(): Promise<PaginatedAnnouncements> {
  const repo = getAnnouncementRepository();
  const rows = await repo.listAll();

  return {
    items: rows.map(rowToAnnouncement),
    total: rows.length,
  };
}

/** 管理员：获取单个公告 */
export async function getAnnouncementById(id: string): Promise<Announcement | null> {
  const repo = getAnnouncementRepository();
  const row = await repo.getAnnouncementById(id);
  return row ? rowToAnnouncement(row) : null;
}

/** 管理员：创建公告 */
export async function createAnnouncement(
  createdBy: string,
  input: AnnouncementInput,
): Promise<Announcement> {
  const repo = getAnnouncementRepository();
  const engine = await getDbEngine();
  const id = crypto.randomUUID();

  await engine.transaction(async (tx) => {
    await repo.insertAnnouncement(tx, id, {
      title: input.title.trim(),
      content: input.content?.trim() ?? null,
      level: input.level ?? 'info',
      isDismissible: input.isDismissible !== false ? 1 : 0,
      priority: input.priority ?? 0,
      expiresAt: input.expiresAt || null,
      targetRoles: input.targetRoles ? JSON.stringify(input.targetRoles) : null,
      createdBy,
    });
  });

  const row = await repo.getAnnouncementById(id);
  return rowToAnnouncement(row as AnnouncementRow);
}

/** 管理员：更新公告 */
export async function updateAnnouncement(
  id: string,
  input: Partial<AnnouncementInput & { isActive: boolean }>,
): Promise<Announcement | null> {
  const repo = getAnnouncementRepository();
  const existing = await repo.getAnnouncementById(id);
  if (!existing) return null;

  const title = input.title !== undefined ? input.title.trim() : existing.title;
  const content = input.content !== undefined ? (input.content?.trim() ?? null) : existing.content;
  const level = input.level ?? existing.level;
  const isDismissible = input.isDismissible !== undefined ? (input.isDismissible ? 1 : 0) : (existing.is_dismissible ? 1 : 0);
  const priority = input.priority ?? existing.priority;
  const expiresAt = input.expiresAt !== undefined
    ? (input.expiresAt || null)
    : existing.expires_at;
  const targetRoles = input.targetRoles !== undefined
    ? (input.targetRoles ? JSON.stringify(input.targetRoles) : null)
    : (existing.target_roles ? existing.target_roles : null);
  const isActive = input.isActive !== undefined ? (input.isActive ? 1 : 0) : (existing.is_active ? 1 : 0);

  await repo.updateAnnouncement(id, {
    title,
    content,
    level,
    isActive,
    isDismissible,
    priority,
    expiresAt,
    targetRoles,
  });

  const updatedRow = await repo.getAnnouncementById(id);
  return updatedRow ? rowToAnnouncement(updatedRow) : null;
}

/** 管理员：删除公告 */
export async function deleteAnnouncement(id: string): Promise<boolean> {
  const repo = getAnnouncementRepository();
  const result = await repo.deleteAnnouncement(id);
  return result > 0;
}

/** 管理员：切换公告激活状态 */
export async function toggleAnnouncementActive(id: string): Promise<Announcement | null> {
  const repo = getAnnouncementRepository();
  const existing = await repo.getAnnouncementById(id);
  if (!existing) return null;

  await repo.setActive(id, existing.is_active ? 0 : 1);

  const toggledRow = await repo.getAnnouncementById(id);
  return toggledRow ? rowToAnnouncement(toggledRow) : null;
}