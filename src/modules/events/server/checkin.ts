/**
 * @file 活动签到服务
 */

import crypto from 'node:crypto';
import { getDb } from '@/shared/db';
import { AppError } from '@/shared/app-error';
import { logAdminAction } from '@/shared/security/audit';
import {
  type EventCheckin,
  type EventCheckinRow,
} from '../types';

function toCheckin(row: EventCheckinRow): EventCheckin {
  return {
    id: row.id,
    eventId: row.event_id,
    registrationId: row.registration_id ?? null,
    userId: row.user_id ?? null,
    checkinCode: row.checkin_code,
    checkedInAt: row.checked_in_at ?? null,
    checkedInBy: row.checked_in_by ?? null,
    createdAt: row.created_at,
  };
}

function generateCheckinCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** 为活动生成签到码 */
export function generateCheckinCodes(adminId: string, eventId: string): { generated: number; skipped: number } {
  const db = getDb();

  const event = db.prepare('SELECT id, title FROM events WHERE id = ?').get(eventId) as
    | { id: string; title: string }
    | undefined;
  if (!event) {
    throw new AppError('活动不存在', 'NOT_FOUND');
  }

  const registrations = db
    .prepare(
      "SELECT id, user_id FROM event_registrations WHERE event_id = ? AND status = 'registered'",
    )
    .all(eventId) as Array<{ id: string; user_id: string }>;

  if (registrations.length === 0) return { generated: 0, skipped: 0 };

  let generated = 0;
  let skipped = 0;

  const insert = db.prepare(
    'INSERT OR IGNORE INTO event_checkins (id, event_id, registration_id, user_id, checkin_code) VALUES (?, ?, ?, ?, ?)',
  );

  for (const reg of registrations) {
    const id = crypto.randomUUID();
    const code = generateCheckinCode();
    const result = insert.run(id, eventId, reg.id, reg.user_id, code);
    if (result.changes > 0) generated++;
    else skipped++;
  }

  logAdminAction(adminId, 'generate_checkin_codes', null, {
    eventId,
    eventTitle: event.title,
    generated,
    skipped,
  });

  return { generated, skipped };
}

/** 获取活动的所有签到记录 */
export function getEventCheckins(eventId: string): EventCheckin[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM event_checkins WHERE event_id = ? ORDER BY created_at ASC')
    .all(eventId) as EventCheckinRow[];
  return rows.map(toCheckin);
}

/** 通过签到码进行签到 */
export function checkinByCode(
  adminId: string,
  eventId: string,
  code: string,
): { ok: boolean; checkin?: EventCheckin; displayName?: string; error?: string } {
  const db = getDb();

  const checkinRow = db
    .prepare(
      'SELECT ec.*, u.display_name FROM event_checkins ec LEFT JOIN users u ON ec.user_id = u.id WHERE ec.event_id = ? AND ec.checkin_code = ?',
    )
    .get(eventId, code) as (EventCheckinRow & { display_name: string | null }) | undefined;

  if (!checkinRow) {
    return { ok: false, error: '签到码无效' };
  }

  if (checkinRow.checked_in_at) {
    return {
      ok: false,
      error: `该签到码已于 ${checkinRow.checked_in_at} 使用`,
      displayName: checkinRow.display_name ?? undefined,
    };
  }

  db.prepare(
    "UPDATE event_checkins SET checked_in_at = datetime('now'), checked_in_by = ? WHERE id = ?",
  ).run(adminId, checkinRow.id);

  logAdminAction(adminId, 'event_checkin', checkinRow.user_id, {
    eventId,
    checkinId: checkinRow.id,
    code,
  });

  const updated = db.prepare('SELECT * FROM event_checkins WHERE id = ?').get(checkinRow.id) as EventCheckinRow;

  return {
    ok: true,
    checkin: toCheckin(updated),
    displayName: checkinRow.display_name ?? undefined,
  };
}

/** 获取签到统计数据 */
export function getCheckinStats(eventId: string): {
  total: number;
  checkedIn: number;
  notCheckedIn: number;
} {
  const db = getDb();
  const rows = db
    .prepare(
      'SELECT COUNT(*) as total, COALESCE(SUM(CASE WHEN checked_in_at IS NOT NULL THEN 1 ELSE 0 END), 0) as checked_in FROM event_checkins WHERE event_id = ?',
    )
    .get(eventId) as { total: number; checked_in: number };

  return {
    total: rows.total,
    checkedIn: rows.checked_in,
    notCheckedIn: rows.total - rows.checked_in,
  };
}