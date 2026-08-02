/**
 * @file 全站公告模块 Repository（ADR-009）
 *
 * 覆盖表：announcements
 */
import type { DbEngine } from '@/shared/db/drivers';
import { resolveEngine } from './base';

export interface AnnouncementRow {
  [key: string]: unknown;
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

export interface AnnouncementRepository {
  insertAnnouncement(
    tx: DbEngine,
    id: string,
    input: {
      title: string;
      content: string | null;
      level: string;
      isDismissible: number;
      priority: number;
      expiresAt: string | null;
      targetRoles: string | null;
      createdBy: string;
    },
  ): Promise<void>;
  getAnnouncementById(id: string, eng?: DbEngine): Promise<AnnouncementRow | null>;
  listActive(eng?: DbEngine): Promise<AnnouncementRow[]>;
  listAll(eng?: DbEngine): Promise<AnnouncementRow[]>;
  updateAnnouncement(
    id: string,
    fields: {
      title: string;
      content: string | null;
      level: string;
      isActive: number;
      isDismissible: number;
      priority: number;
      expiresAt: string | null;
      targetRoles: string | null;
    },
    eng?: DbEngine,
  ): Promise<void>;
  deleteAnnouncement(id: string, eng?: DbEngine): Promise<number>;
  setActive(id: string, isActive: number, eng?: DbEngine): Promise<void>;
}

function createAnnouncementRepository(): AnnouncementRepository {
  return {
    async insertAnnouncement(tx, id, input) {
      await tx.execute(
        `INSERT INTO announcements (id, title, content, level, is_dismissible, priority, expires_at, target_roles, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, input.title, input.content, input.level, input.isDismissible, input.priority, input.expiresAt, input.targetRoles, input.createdBy],
      );
    },
    async getAnnouncementById(id, eng) {
      const e = await resolveEngine(eng);
      return e.queryOne<AnnouncementRow>('SELECT * FROM announcements WHERE id = ?', [id]);
    },
    async listActive(eng) {
      const e = await resolveEngine(eng);
      return e.query<AnnouncementRow>(
        `SELECT * FROM announcements
         WHERE is_active = 1
           AND (expires_at IS NULL OR datetime(expires_at) > datetime('now'))
         ORDER BY priority DESC, created_at DESC`,
      );
    },
    async listAll(eng) {
      const e = await resolveEngine(eng);
      return e.query<AnnouncementRow>('SELECT * FROM announcements ORDER BY created_at DESC');
    },
    async updateAnnouncement(id, fields, eng) {
      const e = await resolveEngine(eng);
      await e.execute(
        `UPDATE announcements
         SET title = ?, content = ?, level = ?, is_active = ?, is_dismissible = ?,
             priority = ?, expires_at = ?, target_roles = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [fields.title, fields.content, fields.level, fields.isActive, fields.isDismissible, fields.priority, fields.expiresAt, fields.targetRoles, id],
      );
    },
    async deleteAnnouncement(id, eng) {
      const e = await resolveEngine(eng);
      return e.execute('DELETE FROM announcements WHERE id = ?', [id]);
    },
    async setActive(id, isActive, eng) {
      const e = await resolveEngine(eng);
      await e.execute('UPDATE announcements SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?', [isActive, id]);
    },
  };
}

let announcementRepo: AnnouncementRepository | null = null;

/** 同步返回 AnnouncementRepository 单例 */
export function getAnnouncementRepository(): AnnouncementRepository {
  if (!announcementRepo) announcementRepo = createAnnouncementRepository();
  return announcementRepo;
}
