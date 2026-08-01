/**
 * @file 全站公告服务层 — 管理员管理，前端通过 API 获取生效公告
 */
import crypto from 'node:crypto';
import 'server-only';
import { getDb } from '@/shared/db';
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
export function getActiveAnnouncements(userRole?: string): Announcement[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM announcements
       WHERE is_active = 1
         AND (expires_at IS NULL OR datetime(expires_at) > datetime('now'))
       ORDER BY priority DESC, created_at DESC`,
    )
    .all() as AnnouncementRow[];

  return rows
    .map(rowToAnnouncement)
    .filter((a) => {
      if (!a.targetRoles || a.targetRoles.length === 0) return true;
      if (!userRole) return false;
      return a.targetRoles.includes(userRole);
    });
}

/** 管理员：列出所有公告 */
export function listAllAnnouncements(): PaginatedAnnouncements {
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM announcements ORDER BY created_at DESC')
    .all() as AnnouncementRow[];

  return {
    items: rows.map(rowToAnnouncement),
    total: rows.length,
  };
}

/** 管理员：获取单个公告 */
export function getAnnouncementById(id: string): Announcement | null {
  const db = getDb();
  const row = db
    .prepare('SELECT * FROM announcements WHERE id = ?')
    .get(id) as AnnouncementRow | undefined;
  return row ? rowToAnnouncement(row) : null;
}

/** 管理员：创建公告 */
export function createAnnouncement(
  createdBy: string,
  input: AnnouncementInput,
): Announcement {
  const db = getDb();
  const id = crypto.randomUUID();

  db.prepare(
    `INSERT INTO announcements (id, title, content, level, is_dismissible, priority, expires_at, target_roles, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.title.trim(),
    input.content?.trim() ?? null,
    input.level ?? 'info',
    input.isDismissible !== false ? 1 : 0,
    input.priority ?? 0,
    // R17: 空字符串归一化为 null（UI 空输入应表示"永不过期"，而非写入 ''）
    input.expiresAt || null,
    input.targetRoles ? JSON.stringify(input.targetRoles) : null,
    createdBy,
  );

  return getAnnouncementById(id)!;
}

/** 管理员：更新公告 */
export function updateAnnouncement(
  id: string,
  input: Partial<AnnouncementInput & { isActive: boolean }>,
): Announcement | null {
  const db = getDb();
  const existing = getAnnouncementById(id);
  if (!existing) return null;

  const title = input.title !== undefined ? input.title.trim() : existing.title;
  const content = input.content !== undefined ? (input.content?.trim() ?? null) : existing.content;
  const level = input.level ?? existing.level;
  const isDismissible = input.isDismissible !== undefined ? (input.isDismissible ? 1 : 0) : (existing.isDismissible ? 1 : 0);
  const priority = input.priority ?? existing.priority;
  // R17: 显式传入空字符串时归一化为 null（UI 清空过期时间应表示"永不过期"）
  const expiresAt = input.expiresAt !== undefined
    ? (input.expiresAt || null)
    : existing.expiresAt;
  const targetRoles = input.targetRoles !== undefined
    ? (input.targetRoles ? JSON.stringify(input.targetRoles) : null)
    : (existing.targetRoles ? JSON.stringify(existing.targetRoles) : null);
  const isActive = input.isActive !== undefined ? (input.isActive ? 1 : 0) : (existing.isActive ? 1 : 0);

  db.prepare(
    `UPDATE announcements
     SET title = ?, content = ?, level = ?, is_active = ?, is_dismissible = ?,
         priority = ?, expires_at = ?, target_roles = ?, updated_at = datetime('now')
     WHERE id = ?`,
  ).run(title, content, level, isActive, isDismissible, priority, expiresAt, targetRoles, id);

  return getAnnouncementById(id);
}

/** 管理员：删除公告 */
export function deleteAnnouncement(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
  return result.changes > 0;
}

/** 管理员：切换公告激活状态 */
export function toggleAnnouncementActive(id: string): Announcement | null {
  const db = getDb();
  const existing = getAnnouncementById(id);
  if (!existing) return null;

  db.prepare(
    `UPDATE announcements SET is_active = ?, updated_at = datetime('now') WHERE id = ?`,
  ).run(existing.isActive ? 0 : 1, id);

  return getAnnouncementById(id);
}