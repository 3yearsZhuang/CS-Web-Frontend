/**
 * @file TenantContext 单元测试
 *
 * 验证多租户占位接口的行为：
 *   1. 单租户模式默认返回 null tenantId + ['*'] scopes
 *   2. isMultiTenantEnabled 默认 false
 *   3. withTenantFilter no-op（不修改 SQL）
 *   4. 返回引用稳定（同一进程内永远返回同一对象）
 */
import { describe, it, expect } from 'vitest';
import {
  getCurrentTenant,
  isMultiTenantEnabled,
  withTenantFilter,
} from '../../src/shared/security/tenant-context';

describe('TenantContext（单租户占位）', () => {
  describe('getCurrentTenant', () => {
    it('返回单租户模式上下文', () => {
      const tenant = getCurrentTenant();
      expect(tenant.tenantId).toBeNull();
      expect(tenant.scopes).toEqual(['*']);
    });

    it('返回引用稳定（同一进程内同一对象）', () => {
      const a = getCurrentTenant();
      const b = getCurrentTenant();
      expect(a).toBe(b); // 引用相等
    });

    it('返回对象被 freeze（不可变）', () => {
      const tenant = getCurrentTenant();
      expect(Object.isFrozen(tenant)).toBe(true);
      expect(Object.isFrozen(tenant.scopes)).toBe(true);
    });
  });

  describe('isMultiTenantEnabled', () => {
    it('默认返回 false', () => {
      expect(isMultiTenantEnabled()).toBe(false);
    });
  });

  describe('withTenantFilter', () => {
    it('单租户模式下 no-op（原样返回 SQL）', () => {
      const sql = 'SELECT * FROM users WHERE id = ?';
      expect(withTenantFilter(sql)).toBe(sql);
    });
  });
});
