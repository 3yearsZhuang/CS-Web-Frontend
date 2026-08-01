/**
 * @file event.schema.ts — 活动模块 Drizzle schema 定义（participations / events / registrations / checkins）
 */
import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import {
  pgTable,
  text as pgText,
  integer as pgInteger,
  timestamp,
  index as pgIndex,
  uniqueIndex as pgUniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const activityParticipationsSqlite = sqliteTable(
  'activity_participations',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    activityTitle: text('activity_title').notNull(),
    activityDate: text('activity_date').notNull(),
    role: text('role'),
    createdAt: text('created_at').default(sql`datetime('now')`),
  },
  (table) => ({
    userIdIdx: index('idx_activity_participations_user_id').on(table.userId),
  }),
);

export const activityParticipationsPg = pgTable(
  'activity_participations',
  {
    id: pgText('id').primaryKey(),
    userId: pgText('user_id').notNull(),
    activityTitle: pgText('activity_title').notNull(),
    activityDate: pgText('activity_date').notNull(),
    role: pgText('role'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    userIdIdx: pgIndex('idx_activity_participations_user_id').on(table.userId),
  }),
);

export const eventsSqlite = sqliteTable(
  'events',
  {
    id: text('id').primaryKey(),
    month: text('month'),
    date: text('date'),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status'),
    year: text('year'),
    topics: text('topics'),
    tags: text('tags'),
    isPinned: integer('is_pinned').notNull().default(0),
    capacity: integer('capacity').notNull().default(0),
    contentMarkdown: text('content_markdown'),
    createdBy: text('created_by'),
    registrationFields: text('registration_fields'),
    createdAt: text('created_at').default(sql`datetime('now')`),
    updatedAt: text('updated_at').default(sql`datetime('now')`),
  },
  (table) => ({
    isPinnedIdx: index('idx_events_is_pinned').on(table.isPinned),
    statusIdx: index('idx_events_status').on(table.status),
    dateIdx: index('idx_events_date').on(table.date),
  }),
);

export const eventsPg = pgTable(
  'events',
  {
    id: pgText('id').primaryKey(),
    month: pgText('month'),
    date: pgText('date'),
    title: pgText('title').notNull(),
    description: pgText('description'),
    status: pgText('status'),
    year: pgText('year'),
    topics: pgText('topics'),
    tags: pgText('tags'),
    isPinned: pgInteger('is_pinned').notNull().default(0),
    capacity: pgInteger('capacity').notNull().default(0),
    contentMarkdown: pgText('content_markdown'),
    createdBy: pgText('created_by'),
    registrationFields: pgText('registration_fields'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    isPinnedIdx: pgIndex('idx_events_is_pinned').on(table.isPinned),
    statusIdx: pgIndex('idx_events_status').on(table.status),
    dateIdx: pgIndex('idx_events_date').on(table.date),
  }),
);

export const eventRegistrationsSqlite = sqliteTable(
  'event_registrations',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    eventId: text('event_id').notNull(),
    status: text('status').notNull().default('registered'),
    registeredAt: text('registered_at').default(sql`datetime('now')`),
    cancelledAt: text('cancelled_at'),
    formData: text('form_data'),
  },
  (table) => ({
    eventIdIdx: index('idx_event_registrations_event_id').on(table.eventId),
    userIdIdx: index('idx_event_registrations_user_id').on(table.userId),
    // UNIQUE(user_id, event_id) — 防止重复报名
    userEventUniqueIdx: uniqueIndex('idx_event_registrations_unique').on(
      table.userId,
      table.eventId,
    ),
  }),
);

export const eventRegistrationsPg = pgTable(
  'event_registrations',
  {
    id: pgText('id').primaryKey(),
    userId: pgText('user_id').notNull(),
    eventId: pgText('event_id').notNull(),
    status: pgText('status').notNull().default('registered'),
    registeredAt: timestamp('registered_at', { withTimezone: true }).defaultNow(),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    formData: pgText('form_data'),
  },
  (table) => ({
    eventIdIdx: pgIndex('idx_event_registrations_event_id').on(table.eventId),
    userIdIdx: pgIndex('idx_event_registrations_user_id').on(table.userId),
    userEventUniqueIdx: pgUniqueIndex('idx_event_registrations_unique').on(
      table.userId,
      table.eventId,
    ),
  }),
);

export const eventCheckinsSqlite = sqliteTable(
  'event_checkins',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id').notNull(),
    registrationId: text('registration_id'),
    userId: text('user_id'),
    checkinCode: text('checkin_code').notNull(),
    checkedInAt: text('checked_in_at'),
    checkedInBy: text('checked_in_by'),
    createdAt: text('created_at').default(sql`datetime('now')`),
  },
  (table) => ({
    eventIdIdx: index('idx_event_checkins_event_id').on(table.eventId),
    checkinCodeIdx: index('idx_event_checkins_code').on(table.checkinCode),
    // UNIQUE(registration_id) — 一次报名只能签到一次
    registrationUniqueIdx: uniqueIndex('idx_event_checkins_registration').on(
      table.registrationId,
    ),
  }),
);

export const eventCheckinsPg = pgTable(
  'event_checkins',
  {
    id: pgText('id').primaryKey(),
    eventId: pgText('event_id').notNull(),
    registrationId: pgText('registration_id'),
    userId: pgText('user_id'),
    checkinCode: pgText('checkin_code').notNull(),
    checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
    checkedInBy: pgText('checked_in_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    eventIdIdx: pgIndex('idx_event_checkins_event_id').on(table.eventId),
    checkinCodeIdx: pgIndex('idx_event_checkins_code').on(table.checkinCode),
    registrationUniqueIdx: pgUniqueIndex('idx_event_checkins_registration').on(
      table.registrationId,
    ),
  }),
);

export interface EventSchemaSet {
  activityParticipations:
    | typeof activityParticipationsSqlite
    | typeof activityParticipationsPg;
  events: typeof eventsSqlite | typeof eventsPg;
  eventRegistrations: typeof eventRegistrationsSqlite | typeof eventRegistrationsPg;
  eventCheckins: typeof eventCheckinsSqlite | typeof eventCheckinsPg;
}

export function getEventSchema(): EventSchemaSet {
  if (process.env.DATABASE_PROVIDER === 'pg') {
    return {
      activityParticipations: activityParticipationsPg,
      events: eventsPg,
      eventRegistrations: eventRegistrationsPg,
      eventCheckins: eventCheckinsPg,
    };
  }
  return {
    activityParticipations: activityParticipationsSqlite,
    events: eventsSqlite,
    eventRegistrations: eventRegistrationsSqlite,
    eventCheckins: eventCheckinsSqlite,
  };
}
