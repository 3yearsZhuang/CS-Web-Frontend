/**
 * @file 活动模块 Repository（ADR-009）
 *
 * 覆盖表：events / event_registrations / event_checkins / settings(活动模块)
 */
import crypto from 'node:crypto';
import type { DbEngine, QueryRow, QueryParams } from '@/shared/db/drivers';
import { resolveEngine } from './base';

export interface EventRow {
  [key: string]: unknown;
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  date: string | null;
  location: string | null;
  capacity: number;
  tags: string | null;
  cover_image: string | null;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventRegistrationRow {
  [key: string]: unknown;
  id: string;
  user_id: string;
  event_id: string;
  status: string;
  form_data: string | null;
  registered_at: string;
  cancelled_at: string | null;
}

export interface EventCheckinRow {
  [key: string]: unknown;
  id: string;
  event_id: string;
  registration_id: string | null;
  user_id: string | null;
  checkin_code: string;
  checked_in_at: string | null;
  checked_in_by: string | null;
  created_at: string;
}

export interface EventStatRaw {
  [key: string]: unknown;
  id: string;
  title: string;
  capacity: number;
  total_registrations: number;
  registered_count: number;
  cancelled_count: number;
  waitlisted_count: number;
}

export interface EventsRepository {
  // ---- events ----
  listEvents(where: string[], params: unknown[], limit: number, offset: number, eng?: DbEngine): Promise<EventRow[]>;
  countEvents(where: string[], params: unknown[], eng?: DbEngine): Promise<number>;
  getEventById(id: string, eng?: DbEngine): Promise<EventRow | null>;
  insertEvent(
    input: {
      id: string;
      title: string;
      description: string | null;
      content: string | null;
      date: string | null;
      location: string | null;
      capacity: number;
      tags: string;
      coverImage: string | null;
      status: string;
      createdBy: string | null;
    },
    eng?: DbEngine,
  ): Promise<void>;
  updateEvent(sets: string[], values: unknown[], id: string, eng?: DbEngine): Promise<void>;
  archivePastEvents(nowDate: string, eng?: DbEngine): Promise<number>;

  // ---- event_registrations ----
  getRegistration(userId: string, eventId: string, eng?: DbEngine): Promise<EventRegistrationRow | null>;
  countRegistrations(where: string[], params: unknown[], eng?: DbEngine): Promise<number>;
  checkCapacityUsed(eventId: string, eng?: DbEngine): Promise<number>;
  listRegistrations(eventId: string, eng?: DbEngine): Promise<Array<EventRegistrationRow & { email: string | null; display_name: string | null }>>;
  /** 列出某用户已报名（status='registered'）的活动，按报名时间倒序 */
  listUserRegisteredEvents(userId: string, eng?: DbEngine): Promise<EventRow[]>;
  insertRegistration(
    input: { id: string; userId: string; eventId: string; status: string; formData: string | null },
    eng?: DbEngine,
  ): Promise<void>;
  updateRegistrationStatus(id: string, status: string, cancelledAt: string | null, eng?: DbEngine): Promise<void>;
  deleteRegistration(id: string, eng?: DbEngine): Promise<void>;
  getEventStats(eng?: DbEngine): Promise<EventStatRaw[]>;

  // ---- event_checkins ----
  getEventTitle(id: string, eng?: DbEngine): Promise<{ id: string; title: string } | null>;
  listRegisteredUserIds(eventId: string, eng?: DbEngine): Promise<Array<{ id: string; user_id: string }>>;
  insertCheckin(
    input: { id: string; eventId: string; registrationId: string | null; userId: string | null; code: string },
    eng?: DbEngine,
  ): Promise<number>;
  getCheckinByEventAndCode(
    eventId: string,
    code: string,
    eng?: DbEngine,
  ): Promise<(EventCheckinRow & { display_name: string | null }) | null>;
  updateCheckin(id: string, adminId: string, eng?: DbEngine): Promise<void>;
  getCheckinRow(id: string, eng?: DbEngine): Promise<EventCheckinRow | null>;
  listCheckins(eventId: string, eng?: DbEngine): Promise<EventCheckinRow[]>;
  getCheckinStats(eventId: string, eng?: DbEngine): Promise<{ total: number; checked_in: number }>;

  // ---- settings ----
  ensureSettingsTable(eng?: DbEngine): Promise<void>;
  readSetting(key: string, eng?: DbEngine): Promise<string | null>;
  writeSetting(key: string, value: string, eng?: DbEngine): Promise<void>;
  removeSetting(key: string, eng?: DbEngine): Promise<void>;
  listSettings(eng?: DbEngine): Promise<Array<{ key: string; value: string }>>;

  // ---- ids ----
  newId(): string;
}

function asParams(arr: unknown[]): QueryParams {
  return arr as QueryParams;
}

export function createEventsRepository(): EventsRepository {
  return {
    async listEvents(where, params, limit, offset, eng?) {
      const e = await resolveEngine(eng);
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
      return e.query<EventRow>(
        `SELECT * FROM events ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        asParams([...params, limit, offset]),
      );
    },
    async countEvents(where, params, eng?) {
      const e = await resolveEngine(eng);
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const row = await e.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM events ${whereSql}`,
        asParams(params),
      );
      return row?.count ?? 0;
    },
    async getEventById(id, eng?) {
      const e = await resolveEngine(eng);
      return e.queryOne<EventRow>('SELECT * FROM events WHERE id = ?', [id]);
    },
    async insertEvent(input, eng?) {
      const e = await resolveEngine(eng);
      await e.execute(
        `INSERT INTO events (id, title, description, content, date, location, capacity, tags, cover_image, status, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [input.id, input.title, input.description, input.content, input.date, input.location, input.capacity, input.tags, input.coverImage, input.status, input.createdBy],
      );
    },
    async updateEvent(sets, values, id, eng?) {
      const e = await resolveEngine(eng);
      await e.execute(`UPDATE events SET ${sets.join(', ')} WHERE id = ?`, asParams([...values, id]));
    },
    async archivePastEvents(nowDate, eng?) {
      const e = await resolveEngine(eng);
      return e.execute(
        `UPDATE events SET status = 'ended', updated_at = datetime('now')
         WHERE status != 'ended' AND date IS NOT NULL AND date != ''
           AND substr(REPLACE(REPLACE(date, '.', '-'), '/', '-'), 1, 10) < ?`,
        [nowDate],
      );
    },

    async getRegistration(userId, eventId, eng?) {
      const e = await resolveEngine(eng);
      return e.queryOne<EventRegistrationRow>(
        'SELECT * FROM event_registrations WHERE user_id = ? AND event_id = ?',
        [userId, eventId],
      );
    },
    async countRegistrations(where, params, eng?) {
      const e = await resolveEngine(eng);
      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const row = await e.queryOne<{ count: number }>(
        `SELECT COUNT(*) as count FROM event_registrations ${whereSql}`,
        asParams(params),
      );
      return row?.count ?? 0;
    },
    async checkCapacityUsed(eventId, eng?) {
      const e = await resolveEngine(eng);
      const row = await e.queryOne<{ used: number }>(
        "SELECT COUNT(*) as used FROM event_registrations WHERE event_id = ? AND status = 'registered'",
        [eventId],
      );
      return row?.used ?? 0;
    },
    async listRegistrations(eventId, eng?) {
      const e = await resolveEngine(eng);
      return e.query<EventRegistrationRow & { email: string | null; display_name: string | null }>(
        `SELECT r.id, r.user_id, r.event_id, r.status, r.form_data, r.registered_at, r.cancelled_at,
                u.email, u.display_name
         FROM event_registrations r
         LEFT JOIN users u ON r.user_id = u.id
         WHERE r.event_id = ?
         ORDER BY r.registered_at ASC`,
        [eventId],
      );
    },
    async listUserRegisteredEvents(userId, eng?) {
      const e = await resolveEngine(eng);
      return e.query<EventRow>(
        `SELECT e.*
         FROM events e
         INNER JOIN event_registrations r ON e.id = r.event_id
         WHERE r.user_id = ? AND r.status = 'registered'
         ORDER BY r.registered_at DESC`,
        [userId],
      );
    },
    async insertRegistration(input, eng?) {
      const e = await resolveEngine(eng);
      await e.execute(
        `INSERT INTO event_registrations (id, user_id, event_id, status, form_data, registered_at)
         VALUES (?, ?, ?, ?, ?, datetime('now'))`,
        [input.id, input.userId, input.eventId, input.status, input.formData],
      );
    },
    async updateRegistrationStatus(id, status, cancelledAt, eng?) {
      const e = await resolveEngine(eng);
      await e.execute(
        "UPDATE event_registrations SET status = ?, cancelled_at = ?, updated_at = datetime('now') WHERE id = ?",
        [status, cancelledAt, id],
      );
    },
    async deleteRegistration(id, eng?) {
      const e = await resolveEngine(eng);
      await e.execute('DELETE FROM event_registrations WHERE id = ?', [id]);
    },
    async getEventStats(eng?) {
      const e = await resolveEngine(eng);
      return e.query<EventStatRaw>(
        `SELECT
          e.id,
          e.title,
          e.capacity,
          COUNT(er.id) as total_registrations,
          SUM(CASE WHEN er.status = 'registered' THEN 1 ELSE 0 END) as registered_count,
          SUM(CASE WHEN er.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_count,
          SUM(CASE WHEN er.status = 'waitlisted' THEN 1 ELSE 0 END) as waitlisted_count
        FROM events e
        LEFT JOIN event_registrations er ON e.id = er.event_id
        GROUP BY e.id
        ORDER BY e.date DESC`,
      );
    },

    async getEventTitle(id, eng?) {
      const e = await resolveEngine(eng);
      return e.queryOne<{ id: string; title: string }>('SELECT id, title FROM events WHERE id = ?', [id]);
    },
    async listRegisteredUserIds(eventId, eng?) {
      const e = await resolveEngine(eng);
      return e.query<{ id: string; user_id: string }>(
        "SELECT id, user_id FROM event_registrations WHERE event_id = ? AND status = 'registered'",
        [eventId],
      );
    },
    async insertCheckin(input, eng?) {
      const e = await resolveEngine(eng);
      return e.execute(
        'INSERT OR IGNORE INTO event_checkins (id, event_id, registration_id, user_id, checkin_code) VALUES (?, ?, ?, ?, ?)',
        [input.id, input.eventId, input.registrationId, input.userId, input.code],
      );
    },
    async getCheckinByEventAndCode(eventId, code, eng?) {
      const e = await resolveEngine(eng);
      return e.queryOne<EventCheckinRow & { display_name: string | null }>(
        `SELECT ec.*, u.display_name FROM event_checkins ec
         LEFT JOIN users u ON ec.user_id = u.id
         WHERE ec.event_id = ? AND ec.checkin_code = ?`,
        [eventId, code],
      );
    },
    async updateCheckin(id, adminId, eng?) {
      const e = await resolveEngine(eng);
      await e.execute(
        "UPDATE event_checkins SET checked_in_at = datetime('now'), checked_in_by = ? WHERE id = ?",
        [adminId, id],
      );
    },
    async getCheckinRow(id, eng?) {
      const e = await resolveEngine(eng);
      return e.queryOne<EventCheckinRow>('SELECT * FROM event_checkins WHERE id = ?', [id]);
    },
    async listCheckins(eventId, eng?) {
      const e = await resolveEngine(eng);
      return e.query<EventCheckinRow>(
        'SELECT * FROM event_checkins WHERE event_id = ? ORDER BY created_at ASC',
        [eventId],
      );
    },
    async getCheckinStats(eventId, eng?) {
      const e = await resolveEngine(eng);
      const row = await e.queryOne<{ total: number; checked_in: number }>(
        `SELECT COUNT(*) as total, COALESCE(SUM(CASE WHEN checked_in_at IS NOT NULL THEN 1 ELSE 0 END), 0) as checked_in
         FROM event_checkins WHERE event_id = ?`,
        [eventId],
      );
      return { total: row?.total ?? 0, checked_in: row?.checked_in ?? 0 };
    },

    async ensureSettingsTable(eng?) {
      const e = await resolveEngine(eng);
      await e.execute(`
        CREATE TABLE IF NOT EXISTS settings (
          id TEXT PRIMARY KEY,
          module TEXT NOT NULL,
          key TEXT NOT NULL,
          value TEXT NOT NULL,
          updated_at TEXT DEFAULT (datetime('now')),
          UNIQUE(module, key)
        );
      `);
    },
    async readSetting(key, eng?) {
      const e = await resolveEngine(eng);
      const row = await e.queryOne<{ value: string }>(
        'SELECT value FROM settings WHERE module = ? AND key = ?',
        ['events', key],
      );
      return row?.value ?? null;
    },
    async writeSetting(key, value, eng?) {
      const e = await resolveEngine(eng);
      await e.execute(
        `INSERT INTO settings (id, module, key, value, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))
         ON CONFLICT(module, key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')`,
        [crypto.randomUUID(), 'events', key, value],
      );
    },
    async removeSetting(key, eng?) {
      const e = await resolveEngine(eng);
      await e.execute('DELETE FROM settings WHERE module = ? AND key = ?', ['events', key]);
    },
    async listSettings(eng?) {
      const e = await resolveEngine(eng);
      return e.query<{ key: string; value: string }>(
        'SELECT key, value FROM settings WHERE module = ?',
        ['events'],
      );
    },

    newId() {
      return crypto.randomUUID();
    },
  };
}

let singleton: EventsRepository | null = null;

export function getEventsRepository(): EventsRepository {
  if (!singleton) singleton = createEventsRepository();
  return singleton;
}

/** 测试注入：重建单例 */
export function _setEventsRepositoryForTest(_engine: DbEngine): void {
  singleton = createEventsRepository();
}
