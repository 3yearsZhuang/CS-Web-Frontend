/**
 * @file 社区举报服务层（已迁移至 Repository 抽象层，ADR-009）
 *
 * 用户提交举报（防重复），管理员查看与处理（resolve/dismiss）。
 * 举报仅记录，不直接处置内容；内容处置由审核后端（moderation）完成。
 */
import crypto from 'node:crypto';
import { getCommunityRepository } from '@/shared/db/repositories/community.repo';
import { loadAuthorSummaries } from '../shared';
import { AppError } from '@/shared/app-error';
import { logAdminAction } from '@/shared/security/audit';

export type ReportStatus = 'pending' | 'resolved' | 'dismissed';
export type ReportTargetType = 'topic' | 'comment';

export interface ReportListItem {
  id: string;
  reporterId: string;
  reporterName: string | null;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  detail: string | null;
  status: ReportStatus;
  createdAt: string;
}

export interface PaginatedReports {
  items: ReportListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

/** 提交举报（同一用户对同一目标仅允许一条 pending 举报） */
export async function submitReport(input: {
  reporterId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  detail?: string | null;
}): Promise<{ id: string }> {
  const repo = getCommunityRepository();

  // 校验目标存在
  if (input.targetType === 'topic') {
    const topic = await repo.getPostById(input.targetId);
    if (!topic) throw new AppError('举报的内容不存在', 'NOT_FOUND');
    if (topic.author_id === input.reporterId) {
      throw new AppError('不能举报自己的内容', 'INVALID_OPERATION');
    }
  } else {
    const comment = await repo.getCommentById(input.targetId);
    if (!comment) throw new AppError('举报的内容不存在', 'NOT_FOUND');
    if (comment.author_id === input.reporterId) {
      throw new AppError('不能举报自己的内容', 'INVALID_OPERATION');
    }
  }

  // 防重复（同用户对同目标已有 pending 举报）
  const already = await repo.hasUserReported(input.targetId, input.reporterId);
  if (already) {
    throw new AppError('你已经举报过该内容', 'ALREADY_REPORTED');
  }

  const id = crypto.randomUUID();
  await repo.insertReport({
    id,
    reporterId: input.reporterId,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    detail: input.detail ?? null,
  });
  return { id };
}

/** 管理员列表（支持按状态过滤） */
export async function listReports(params: {
  status?: ReportStatus;
  page?: number;
  pageSize?: number;
} = {}): Promise<PaginatedReports> {
  const repo = getCommunityRepository();
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;

  const where: string[] = [];
  const queryParams: unknown[] = [];
  if (params.status) {
    where.push('status = ?');
    queryParams.push(params.status);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const total = await repo.countReports(whereSql, queryParams);
  const rows = await repo.listReports(whereSql, queryParams, pageSize, offset);
  const reporterIds = [...new Set(rows.map((r) => r.reporter_id))];
  const reporterMap = await repo.loadAuthorSummaries(reporterIds);

  const items: ReportListItem[] = rows.map((r) => ({
    id: r.id,
    reporterId: r.reporter_id,
    reporterName: reporterMap.get(r.reporter_id)?.displayName ?? null,
    targetType: r.target_type as ReportTargetType,
    targetId: r.target_id,
    reason: r.reason,
    detail: r.detail,
    status: r.status as ReportStatus,
    createdAt: r.created_at,
  }));

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return { items, total, page, pageSize, totalPages };
}

async function assertReportPending(reportId: string): Promise<void> {
  const repo = getCommunityRepository();
  const report = await repo.getReportById(reportId);
  if (!report) throw new AppError('举报记录不存在', 'NOT_FOUND');
  if (report.status !== 'pending') {
    throw new AppError('该举报已处理', 'STATUS_CONFLICT');
  }
}

/** 标记举报为已处理（管理员确认违规后，由调用方另行处置内容） */
export async function resolveReport(adminId: string, reportId: string): Promise<void> {
  const repo = getCommunityRepository();
  await assertReportPending(reportId);
  await repo.updateReportStatus(reportId, 'resolved', adminId);
  await logAdminAction(adminId, 'forum_report_resolve', reportId, { targetType: 'report' });
}

/** 驳回举报（管理员认定无违规） */
export async function dismissReport(adminId: string, reportId: string): Promise<void> {
  const repo = getCommunityRepository();
  await assertReportPending(reportId);
  await repo.updateReportStatus(reportId, 'dismissed', adminId);
  await logAdminAction(adminId, 'forum_report_dismiss', reportId, { targetType: 'report' });
}
