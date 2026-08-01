/**
 * @file 分页计算工具 — 统一列表查询的分页数学计算
 *
 * 仅做纯数学计算不涉及 DB 查询；page 从 1 开始，totalPages 始终 ≥ 1（避免前端渲染 0 页异常）。
 */

/** 调用方传入的分页参数与业务约束 */
export interface PaginationInput {
  /** 页码（从 1 开始，缺省 1） */
  page?: number;
  /** 每页数量（缺省使用 defaultPageSize） */
  pageSize?: number;
  /** 业务默认每页数量 */
  defaultPageSize: number;
  /** 业务允许的每页数量上限 */
  maxPageSize: number;
}

/** 计算后的分页元数据，用于拼装 SQL LIMIT/OFFSET */
export interface PaginationMeta {
  page: number;
  pageSize: number;
  offset: number;
}

/** 计算分页元数据（page<1 归一为 1，pageSize 超过 maxPageSize 截断，缺省用 defaultPageSize） */
export function computePagination(input: PaginationInput): PaginationMeta {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(
    input.maxPageSize,
    Math.max(1, input.pageSize ?? input.defaultPageSize),
  );
  const offset = (page - 1) * pageSize;
  return { page, pageSize, offset };
}

/** 计算总页数，始终返回 ≥ 1（total=0 时返回 1，避免前端渲染 0 页异常） */
export function computeTotalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
