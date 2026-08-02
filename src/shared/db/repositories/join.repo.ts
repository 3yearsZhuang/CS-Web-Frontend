/**
 * @file 入社申请模块 Repository（ADR-009）
 *
 * 覆盖表：join_applications
 */
import type { DbEngine, QueryParams } from '@/shared/db/drivers';
import { resolveEngine } from './base';

export interface JoinApplicationRow {
  [key: string]: unknown;
  id: string;
  applicant_name: string;
  student_id: string;
  major: string;
  tech_tags: string | null;
  reason: string;
  contact_qq: string | null;
  contact_phone: string | null;
  user_id: string | null;
  status: string;
  reviewed_by: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface JoinRepository {
  insertApplication(
    tx: DbEngine,
    id: string,
    input: {
      applicantName: string;
      studentId: string;
      major: string;
      techTags: string | null;
      reason: string;
      contactQq: string | null;
      contactPhone: string | null;
      userId: string | null;
    },
  ): Promise<void>;
  getApplicationById(applicationId: string, eng?: DbEngine): Promise<JoinApplicationRow | null>;
  listMyApplications(userId: string, eng?: DbEngine): Promise<JoinApplicationRow[]>;
  listApplications(status: string | null, eng?: DbEngine): Promise<JoinApplicationRow[]>;
  updateApplicationStatus(
    applicationId: string,
    status: string,
    reviewedBy: string,
    reviewNote: string | null,
    eng?: DbEngine,
  ): Promise<void>;
}

function createJoinRepository(): JoinRepository {
  return {
    async insertApplication(tx, id, input) {
      await tx.execute(
        `INSERT INTO join_applications (id, applicant_name, student_id, major, tech_tags, reason, contact_qq, contact_phone, user_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, input.applicantName, input.studentId, input.major, input.techTags, input.reason, input.contactQq, input.contactPhone, input.userId],
      );
    },
    async getApplicationById(applicationId, eng) {
      const e = await resolveEngine(eng);
      return e.queryOne<JoinApplicationRow>('SELECT * FROM join_applications WHERE id = ?', [applicationId]);
    },
    async listMyApplications(userId, eng) {
      const e = await resolveEngine(eng);
      return e.query<JoinApplicationRow>(
        'SELECT * FROM join_applications WHERE user_id = ? ORDER BY created_at DESC',
        [userId],
      );
    },
    async listApplications(status, eng) {
      const e = await resolveEngine(eng);
      if (status) {
        return e.query<JoinApplicationRow>(
          'SELECT * FROM join_applications WHERE status = ? ORDER BY created_at DESC',
          [status],
        );
      }
      return e.query<JoinApplicationRow>('SELECT * FROM join_applications ORDER BY created_at DESC');
    },
    async updateApplicationStatus(applicationId, status, reviewedBy, reviewNote, eng) {
      const e = await resolveEngine(eng);
      await e.execute(
        `UPDATE join_applications SET status = ?, reviewed_by = ?, review_note = ?, updated_at = datetime('now') WHERE id = ?`,
        [status, reviewedBy, reviewNote, applicationId],
      );
    },
  };
}

let joinRepo: JoinRepository | null = null;

/** 同步返回 JoinRepository 单例 */
export function getJoinRepository(): JoinRepository {
  if (!joinRepo) joinRepo = createJoinRepository();
  return joinRepo;
}
