/**
 * @file 审计日志相关共享类型（纯类型，client + server 同构）
 *
 * 被 security/audit.ts（服务端）与 modules/admin/types（同构）共用，切断 types/ → server-only 的引用链。
 */

/** 审计上下文 — 路由层传入，补充 IP 和 User-Agent 到审计日志 */
export interface AuditContext {
  ip?: string | null;
  userAgent?: string | null;
}
