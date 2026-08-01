/**
 * @file TenantContext — 多租户上下文占位接口（当前单租户 no-op，为未来多租户扩展预留）
 */
import 'server-only';

export interface TenantContext {
  /** null=单租户模式（当前默认）；string=多租户模式从 JWT/subdomain 解析的组织 ID */
  tenantId: string | null;
  /** ['*']=全局可见（当前默认）；['org_xxx','public']=组织私有+公开数据 */
  readonly scopes: readonly string[];
}

/** 获取当前请求的租户上下文（当前单租户模式，返回 tenantId=null, scopes=['*']） */
export function getCurrentTenant(): TenantContext {
  return SINGLE_TENANT;
}

/** 单租户模式的常量上下文（永远返回同一引用，避免 GC 压力） */
const SINGLE_TENANT: TenantContext = Object.freeze({
  tenantId: null,
  scopes: Object.freeze(['*']),
});

/** 判断当前是否为多租户模式（当前永远返回 false） */
export function isMultiTenantEnabled(): boolean {
  return process.env.MULTI_TENANT_ENABLED === 'true';
}

/** 为 SQL 查询注入租户过滤条件（当前 no-op，多租户模式启用后在此实现） */
export function withTenantFilter(sql: string): string {
  if (!isMultiTenantEnabled()) return sql;
  return sql;
}
