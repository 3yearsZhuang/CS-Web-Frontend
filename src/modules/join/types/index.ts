/**
 * @file 入社申请模块 — 共享类型
 */

/** 入社申请状态 */
export type JoinApplicationStatus = 'pending' | 'approved' | 'rejected';

/** 入社申请提交表单 */
export interface JoinApplicationInput {
  applicantName: string;
  studentId: string;
  major: string;
  techTags?: string[];
  reason: string;
  contactQq?: string;
  contactPhone?: string;
  /** 关联用户 ID（登录后提交时传入） */
  userId?: string;
}

/** 入社申请记录 */
export interface JoinApplication {
  id: string;
  applicantName: string;
  studentId: string;
  major: string;
  techTags: string[];
  reason: string;
  contactQq: string | null;
  contactPhone: string | null;
  /** 关联用户 ID（可为空，兼容旧数据） */
  userId: string | null;
  status: JoinApplicationStatus;
  reviewedBy: string | null;
  reviewNote: string | null;
  createdAt: string;
  updatedAt: string;
}