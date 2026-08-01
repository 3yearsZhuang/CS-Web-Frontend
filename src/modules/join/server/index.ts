/**
 * @file 入社申请服务层 — 登录提交（关联 userId），管理员审批（路由层 requireAdmin 守卫）
 */
import crypto from 'node:crypto';
import 'server-only';
import { getDb } from '@/shared/db';
import { AppError } from '@/shared/app-error';
import { logAdminAction } from '@/shared/security/audit';
import { createNotification } from '@/modules/notification/server/notification-core';
import type { JoinApplication, JoinApplicationInput, JoinApplicationStatus } from '../types';

export type { JoinApplication, JoinApplicationInput, JoinApplicationStatus };

interface JoinApplicationRow {
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

function toJoinApplication(row: JoinApplicationRow): JoinApplication {
  let techTags: string[] = [];
  try {
    if (row.tech_tags) techTags = JSON.parse(row.tech_tags) as string[];
  } catch {
    // 忽略解析失败
  }
  return {
    id: row.id,
    applicantName: row.applicant_name,
    studentId: row.student_id,
    major: row.major,
    techTags,
    reason: row.reason,
    contactQq: row.contact_qq ?? null,
    contactPhone: row.contact_phone ?? null,
    userId: row.user_id ?? null,
    status: row.status as JoinApplicationStatus,
    reviewedBy: row.reviewed_by ?? null,
    reviewNote: row.review_note ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const JOIN_LIMITS = {
  NAME_MAX: 20,
  STUDENT_ID_MAX: 20,
  MAJOR_MAX: 40,
  REASON_MAX: 500,
  QQ_MAX: 20,
  PHONE_MAX: 20,
  TAGS_MAX: 10,
  TAG_MAX: 20,
} as const;

function validateInput(input: JoinApplicationInput): string | null {
  if (!input.applicantName || !input.applicantName.trim()) return '姓名不能为空';
  if (input.applicantName.length > JOIN_LIMITS.NAME_MAX) return `姓名不能超过 ${JOIN_LIMITS.NAME_MAX} 字符`;
  if (!input.studentId || !input.studentId.trim()) return '学号不能为空';
  if (input.studentId.length > JOIN_LIMITS.STUDENT_ID_MAX) return `学号不能超过 ${JOIN_LIMITS.STUDENT_ID_MAX} 字符`;
  if (!input.major || !input.major.trim()) return '专业不能为空';
  if (input.major.length > JOIN_LIMITS.MAJOR_MAX) return `专业不能超过 ${JOIN_LIMITS.MAJOR_MAX} 字符`;
  if (!input.reason || !input.reason.trim()) return '申请理由不能为空';
  if (input.reason.length > JOIN_LIMITS.REASON_MAX) return `申请理由不能超过 ${JOIN_LIMITS.REASON_MAX} 字符`;
  if (input.contactQq && input.contactQq.length > JOIN_LIMITS.QQ_MAX) return `QQ 不能超过 ${JOIN_LIMITS.QQ_MAX} 字符`;
  if (input.contactPhone && input.contactPhone.length > JOIN_LIMITS.PHONE_MAX) return `手机号不能超过 ${JOIN_LIMITS.PHONE_MAX} 字符`;
  const tags = input.techTags ?? [];
  if (tags.length > JOIN_LIMITS.TAGS_MAX) return `技术标签不能超过 ${JOIN_LIMITS.TAGS_MAX} 个`;
  if (tags.some((t) => t.length > JOIN_LIMITS.TAG_MAX)) return `单个标签不能超过 ${JOIN_LIMITS.TAG_MAX} 字符`;
  return null;
}

/** 提交入社申请（需登录，关联 userId） */
export function submitJoinApplication(input: JoinApplicationInput): JoinApplication {
  const validationErr = validateInput(input);
  if (validationErr) throw new AppError(validationErr, 'VALIDATION_ERROR');

  const db = getDb();
  const id = crypto.randomUUID();
  const techTagsStr = input.techTags?.length ? JSON.stringify(input.techTags) : null;

  db.prepare(
    `INSERT INTO join_applications (id, applicant_name, student_id, major, tech_tags, reason, contact_qq, contact_phone, user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.applicantName.trim(),
    input.studentId.trim(),
    input.major.trim(),
    techTagsStr,
    input.reason.trim(),
    input.contactQq?.trim() || null,
    input.contactPhone?.trim() || null,
    input.userId ?? null,
  );

  const row = db.prepare('SELECT * FROM join_applications WHERE id = ?').get(id) as JoinApplicationRow;
  return toJoinApplication(row);
}

/** 查询当前用户的入社申请列表 */
export function listMyJoinApplications(userId: string): JoinApplication[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM join_applications WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId) as JoinApplicationRow[];
  return rows.map(toJoinApplication);
}

/** 查询入社申请列表（管理员，支持按状态筛选） */
export function listJoinApplications(status?: JoinApplicationStatus): JoinApplication[] {
  const db = getDb();
  if (status) {
    const rows = db
      .prepare('SELECT * FROM join_applications WHERE status = ? ORDER BY created_at DESC')
      .all(status) as JoinApplicationRow[];
    return rows.map(toJoinApplication);
  }
  const rows = db
    .prepare('SELECT * FROM join_applications ORDER BY created_at DESC')
    .all() as JoinApplicationRow[];
  return rows.map(toJoinApplication);
}

/** 审批入社申请（管理员） */
export function reviewJoinApplication(
  adminId: string,
  applicationId: string,
  status: 'approved' | 'rejected',
  reviewNote?: string,
): JoinApplication {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM join_applications WHERE id = ?').get(applicationId) as
    | JoinApplicationRow
    | undefined;
  if (!existing) {
    throw new AppError('申请不存在', 'NOT_FOUND');
  }
  if (existing.status !== 'pending') {
    throw new AppError('该申请已处理', 'ALREADY_REVIEWED');
  }

  db.prepare(
    `UPDATE join_applications SET status = ?, reviewed_by = ?, review_note = ?, updated_at = datetime('now')
     WHERE id = ?`,
  ).run(status, adminId, reviewNote ?? null, applicationId);

  logAdminAction(adminId, status === 'approved' ? 'approve_join_application' : 'reject_join_application', null, {
    applicationId,
    applicantName: existing.applicant_name,
    studentId: existing.student_id,
    reviewNote,
  });

  // 如果申请关联了用户，发送站内通知
  if (existing.user_id) {
    const title = status === 'approved' ? '入社申请已通过' : '入社申请未通过';
    const content = reviewNote
      ? `${status === 'approved' ? '恭喜！你的入社申请已通过。' : '你的入社申请未通过。'} 备注：${reviewNote}`
      : status === 'approved'
        ? '恭喜！你的入社申请已通过。'
        : '你的入社申请未通过。';
    createNotification(existing.user_id, 'admin', title, content, adminId);
  }

  const row = db.prepare('SELECT * FROM join_applications WHERE id = ?').get(applicationId) as JoinApplicationRow;
  return toJoinApplication(row);
}