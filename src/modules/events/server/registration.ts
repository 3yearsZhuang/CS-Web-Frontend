/**
 * @file 活动报名服务
 */

import crypto from 'node:crypto';
import { getDb } from '@/shared/db';
import { AppError } from '@/shared/app-error';
import { logAdminAction } from '@/shared/security/audit';
import { autoArchivePastEvents } from './archive';
import {
  toEventItem,
  toEventRegistration,
  getRegisteredCount,
} from './crud';
import {
  type EventItem,
  type EventRegistration,
  type EventRegistrationRow,
  type EventRow,
} from '../types';

/** 获取用户的单个活动报名记录 */
export function getUserRegistration(
  userId: string,
  eventId: string,
): EventRegistration | null {
  const db = getDb();
  const row = db
    .prepare(
      'SELECT * FROM event_registrations WHERE user_id = ? AND event_id = ?',
    )
    .get(userId, eventId) as EventRegistrationRow | undefined;
  if (!row) return null;
  return toEventRegistration(row);
}

/** 获取活动的所有报名记录 */
export function getEventRegistrations(eventId: string): EventRegistration[] {
  const db = getDb();
  const rows = db
    .prepare(
      'SELECT * FROM event_registrations WHERE event_id = ? ORDER BY registered_at ASC',
    )
    .all(eventId) as EventRegistrationRow[];
  return rows.map(toEventRegistration);
}

/** 用户报名活动 */
export function registerEvent(
  userId: string,
  eventId: string,
  formData?: Record<string, string>,
): { ok: boolean; registration?: EventRegistration; error?: string } {
  const db = getDb();

  const eventRow = db.prepare('SELECT capacity FROM events WHERE id = ?').get(eventId) as
    | { capacity: number }
    | undefined;
  if (!eventRow) {
    throw new AppError('活动不存在', 'NOT_FOUND');
  }

  const formDataStr = formData && Object.keys(formData).length > 0 ? JSON.stringify(formData) : null;

  const existing = db
    .prepare(
      'SELECT * FROM event_registrations WHERE user_id = ? AND event_id = ?',
    )
    .get(userId, eventId) as EventRegistrationRow | undefined;

  if (existing) {
    if (existing.status === 'registered') {
      throw new AppError('已报名该活动', 'ALREADY_REGISTERED');
    }
    if (existing.status === 'cancelled') {
      if (eventRow.capacity > 0) {
        const registered = getRegisteredCount(eventId);
        if (registered >= eventRow.capacity) {
          throw new AppError('活动名额已满', 'FULL');
        }
      }
      db.prepare(
        "UPDATE event_registrations SET status = 'registered', form_data = ?, cancelled_at = NULL WHERE id = ?",
      ).run(formDataStr, existing.id);
      const updated = db
        .prepare('SELECT * FROM event_registrations WHERE id = ?')
        .get(existing.id) as EventRegistrationRow;
      return { ok: true, registration: toEventRegistration(updated) };
    }
  }

  if (eventRow.capacity > 0) {
    const registered = getRegisteredCount(eventId);
    if (registered >= eventRow.capacity) {
      throw new AppError('活动名额已满', 'FULL');
    }
  }

  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO event_registrations (id, user_id, event_id, status, form_data)
     VALUES (?, ?, ?, 'registered', ?)`,
  ).run(id, userId, eventId, formDataStr);

  const row = db
    .prepare('SELECT * FROM event_registrations WHERE id = ?')
    .get(id) as EventRegistrationRow;
  return { ok: true, registration: toEventRegistration(row) };
}

/** 用户取消活动报名 */
export function cancelEventRegistration(userId: string, eventId: string): void {
  const db = getDb();
  const existing = db
    .prepare(
      'SELECT * FROM event_registrations WHERE user_id = ? AND event_id = ?',
    )
    .get(userId, eventId) as EventRegistrationRow | undefined;

  if (!existing) {
    throw new AppError('报名记录不存在', 'NOT_FOUND');
  }
  if (existing.status === 'cancelled') {
    throw new AppError('报名已取消', 'ALREADY_CANCELLED');
  }

  db.prepare(
    "UPDATE event_registrations SET status = 'cancelled', cancelled_at = datetime('now') WHERE id = ?",
  ).run(existing.id);
}

/** 获取用户已报名的所有活动 */
export function getUserRegisteredEvents(userId: string): EventItem[] {
  const db = getDb();

  autoArchivePastEvents(db);

  const rows = db
    .prepare(
      `SELECT e.* FROM events e
       INNER JOIN event_registrations r ON e.id = r.event_id
       WHERE r.user_id = ? AND r.status = 'registered'
       ORDER BY r.registered_at DESC`,
    )
    .all(userId) as EventRow[];
  return rows.map(toEventItem);
}

/** 管理员手动为用户报名 */
export function adminAddRegistration(
  adminId: string,
  userId: string,
  eventId: string,
  formData?: Record<string, string>,
): { ok: boolean; registration?: EventRegistration; error?: string } {
  const db = getDb();

  const eventRow = db.prepare('SELECT capacity, title FROM events WHERE id = ?').get(eventId) as
    | { capacity: number; title: string }
    | undefined;
  if (!eventRow) {
    throw new AppError('活动不存在', 'NOT_FOUND');
  }

  const existing = db
    .prepare('SELECT * FROM event_registrations WHERE user_id = ? AND event_id = ?')
    .get(userId, eventId) as EventRegistrationRow | undefined;

  if (existing?.status === 'registered') {
    throw new AppError('该用户已报名此活动', 'ALREADY_REGISTERED');
  }

  if (eventRow.capacity > 0) {
    const registered = getRegisteredCount(eventId);
    if (registered >= eventRow.capacity) {
      throw new AppError('活动名额已满', 'FULL');
    }
  }

  const formDataStr = formData && Object.keys(formData).length > 0 ? JSON.stringify(formData) : null;
  const id = crypto.randomUUID();

  if (existing) {
    db.prepare(
      "UPDATE event_registrations SET status = 'registered', form_data = ?, cancelled_at = NULL WHERE id = ?",
    ).run(formDataStr, existing.id);
    const updated = db
      .prepare('SELECT * FROM event_registrations WHERE id = ?')
      .get(existing.id) as EventRegistrationRow;

    logAdminAction(adminId, 'admin_add_registration', userId, { eventId, eventTitle: eventRow.title });
    return { ok: true, registration: toEventRegistration(updated) };
  }

  db.prepare(
    `INSERT INTO event_registrations (id, user_id, event_id, status, form_data)
     VALUES (?, ?, ?, 'registered', ?)`,
  ).run(id, userId, eventId, formDataStr);

  const row = db
    .prepare('SELECT * FROM event_registrations WHERE id = ?')
    .get(id) as EventRegistrationRow;

  logAdminAction(adminId, 'admin_add_registration', userId, { eventId, eventTitle: eventRow.title });
  return { ok: true, registration: toEventRegistration(row) };
}

/** 管理员更新报名状态 */
export function adminUpdateRegistrationStatus(
  adminId: string,
  registrationId: string,
  status: 'cancelled' | 'waitlisted' | 'registered',
): void {
  const db = getDb();
  const existing = db
    .prepare('SELECT * FROM event_registrations WHERE id = ?')
    .get(registrationId) as EventRegistrationRow | undefined;

  if (!existing) {
    throw new AppError('报名记录不存在', 'NOT_FOUND');
  }

  db.prepare(
    `UPDATE event_registrations SET status = ?, cancelled_at = CASE WHEN ? = 'cancelled' THEN datetime('now') ELSE NULL END WHERE id = ?`,
  ).run(status, status, registrationId);

  logAdminAction(adminId, 'admin_update_registration', existing.user_id, {
    registrationId,
    eventId: existing.event_id,
    newStatus: status,
  });
}

/** 获取活动报名统计数据 */
export function getEventRegistrationStats(eventId: string): {
  total: number;
  registered: number;
  cancelled: number;
  waitlisted: number;
} {
  const db = getDb();
  const rows = db
    .prepare(
      'SELECT status, COUNT(*) as count FROM event_registrations WHERE event_id = ? GROUP BY status',
    )
    .all(eventId) as Array<{ status: string; count: number }>;

  const stats = { total: 0, registered: 0, cancelled: 0, waitlisted: 0 };
  for (const row of rows) {
    stats.total += row.count;
    if (row.status === 'registered') stats.registered = row.count;
    else if (row.status === 'cancelled') stats.cancelled = row.count;
    else if (row.status === 'waitlisted') stats.waitlisted = row.count;
  }
  return stats;
}