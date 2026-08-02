/**
 * @file 活动签到服务（已迁移至 Repository 抽象层，ADR-009）
 */
import crypto from 'node:crypto';
import { getEventsRepository } from '@/shared/db/repositories/events.repo';
import type { EventCheckinRow } from '@/shared/db/repositories/events.repo';
import { AppError } from '@/shared/app-error';
import { logAdminAction } from '@/shared/security/audit';
import {
  type EventCheckin,
  type EventCheckinRow as EventCheckinRowType,
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
export async function generateCheckinCodes(adminId: string, eventId: string): Promise<{ generated: number; skipped: number }> {
  const repo = getEventsRepository();

  const event = await repo.getEventTitle(eventId);
  if (!event) {
    throw new AppError('活动不存在', 'NOT_FOUND');
  }

  const registrations = await repo.listRegisteredUserIds(eventId);
  if (registrations.length === 0) return { generated: 0, skipped: 0 };

  let generated = 0;
  let skipped = 0;

  for (const reg of registrations) {
    const id = crypto.randomUUID();
    const code = generateCheckinCode();
    const changes = await repo.insertCheckin({
      id,
      eventId,
      registrationId: reg.id,
      userId: reg.user_id,
      code,
    });
    if (changes > 0) generated++;
    else skipped++;
  }

  await logAdminAction(adminId, 'generate_checkin_codes', eventId, {
    targetType: 'event',
    eventId,
    eventTitle: event.title,
    generated,
    skipped,
  });

  return { generated, skipped };
}

/** 获取活动的所有签到记录 */
export async function getEventCheckins(eventId: string): Promise<EventCheckin[]> {
  const repo = getEventsRepository();
  const rows = await repo.listCheckins(eventId);
  return rows.map(toCheckin);
}

/** 通过签到码进行签到 */
export async function checkinByCode(
  adminId: string,
  eventId: string,
  code: string,
): Promise<{ ok: boolean; checkin?: EventCheckin; displayName?: string; error?: string }> {
  const repo = getEventsRepository();

  const checkinRow = await repo.getCheckinByEventAndCode(eventId, code);
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

  await repo.updateCheckin(checkinRow.id, adminId);
  await logAdminAction(adminId, 'event_checkin', checkinRow.user_id, {
    targetType: 'event',
    eventId,
    checkinId: checkinRow.id,
    code,
  });

  const updated = await repo.getCheckinRow(checkinRow.id);
  if (!updated) return { ok: false, error: '签到记录丢失' };

  return {
    ok: true,
    checkin: toCheckin(updated),
    displayName: checkinRow.display_name ?? undefined,
  };
}

/** 获取签到统计数据 */
export async function getCheckinStats(eventId: string): Promise<{
  total: number;
  checkedIn: number;
  notCheckedIn: number;
}> {
  const repo = getEventsRepository();
  const { total, checked_in } = await repo.getCheckinStats(eventId);
  return {
    total,
    checkedIn: checked_in,
    notCheckedIn: total - checked_in,
  };
}
