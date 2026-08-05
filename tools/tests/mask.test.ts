/**
 * @file 脱敏工具函数单元测试
 *
 * 覆盖 M7 敏感数据脱敏：
 *   - maskEmail / maskPhone
 *   - maskSensitiveFields 递归脱敏（内部使用 maskName / maskStudentId / maskString）
 */
import { describe, it, expect } from 'vitest';
import {
  maskEmail,
  maskPhone,
  maskSensitiveFields,
} from '../../src/shared/utils/mask';

describe('maskEmail', () => {
  it('保留首字符与域名，中间以 **** 填充', () => {
    expect(maskEmail('zhangsan@fztbu.edu.cn')).toBe('z****@fztbu.edu.cn');
    expect(maskEmail('a@example.com')).toBe('a****@example.com');
  });

  it('空值安全', () => {
    expect(maskEmail(null)).toBeNull();
    expect(maskEmail(undefined)).toBeUndefined();
    expect(maskEmail('')).toBeNull();
  });

  it('无 @ 符号的字符串返回 ****', () => {
    expect(maskEmail('notanemail')).toBe('****');
  });

  it('首字符过短（仅 1 字符）仍保留 1 字符', () => {
    expect(maskEmail('a@b.com')).toBe('a****@b.com');
  });
});

describe('maskPhone', () => {
  it('保留前 3 位与后 4 位，中间以 **** 填充', () => {
    expect(maskPhone('13812345678')).toBe('138****5678');
  });

  it('去除非数字字符后脱敏', () => {
    expect(maskPhone('138-1234-5678')).toBe('138****5678');
    expect(maskPhone('+86 138 1234 5678')).toBe('861****5678');
  });

  it('空值安全', () => {
    expect(maskPhone(null)).toBeNull();
    expect(maskPhone(undefined)).toBeUndefined();
  });

  it('数字不足 7 位返回 ****', () => {
    expect(maskPhone('12345')).toBe('****');
    expect(maskPhone('123456')).toBe('****');
  });
});

describe('maskSensitiveFields — 递归脱敏', () => {
  it('根据 key 名称自动选择脱敏策略', () => {
    const input = {
      email: 'zhangsan@fztbu.edu.cn',
      phone: '13812345678',
      name: '张三',
      studentId: '20210101001',
      qq: '123456789',
    };
    const result = maskSensitiveFields(input);
    expect(result.email).toBe('z****@fztbu.edu.cn');
    expect(result.phone).toBe('138****5678');
    expect(result.name).toBe('张*');
    expect(result.studentId).toBe('20****01');
    expect(result.qq).toBe('1****9');
  });

  it('不脱敏非敏感字段', () => {
    const input = {
      id: 'user-001',
      role: 'admin',
      bio: '热爱技术',
      displayName: '张三',
    };
    const result = maskSensitiveFields(input);
    expect(result.id).toBe('user-001');
    expect(result.role).toBe('admin');
    expect(result.bio).toBe('热爱技术');
    expect(result.displayName).toBe('张三');
  });

  it('递归脱敏嵌套对象', () => {
    const input = {
      user: {
        email: 'test@example.com',
        profile: {
          phone: '13812345678',
          bio: '简介',
        },
      },
    };
    const result = maskSensitiveFields(input);
    expect(result.user.email).toBe('t****@example.com');
    expect(result.user.profile.phone).toBe('138****5678');
    expect(result.user.profile.bio).toBe('简介');
  });

  it('递归脱敏数组', () => {
    const input = [
      { email: 'a@example.com', name: '张三' },
      { email: 'b@example.com', name: '李四' },
    ];
    const result = maskSensitiveFields(input);
    expect(result[0].email).toBe('a****@example.com');
    expect(result[0].name).toBe('张*');
    expect(result[1].email).toBe('b****@example.com');
    expect(result[1].name).toBe('李*');
  });

  it('null / undefined / 原始值原样返回', () => {
    expect(maskSensitiveFields(null)).toBeNull();
    expect(maskSensitiveFields(undefined)).toBeUndefined();
    expect(maskSensitiveFields('string')).toBe('string');
    expect(maskSensitiveFields(42)).toBe(42);
  });

  it('驼峰命名匹配（contactPhone → maskPhone）', () => {
    const input = {
      contactPhone: '13812345678',
      contactQq: '123456789',
      applicantName: '张三',
    };
    const result = maskSensitiveFields(input);
    expect(result.contactPhone).toBe('138****5678');
    expect(result.contactQq).toBe('1****9');
    expect(result.applicantName).toBe('张*');
  });

  it('不修改原对象', () => {
    const input = { email: 'test@example.com' };
    const result = maskSensitiveFields(input);
    expect(result).not.toBe(input);
    expect(input.email).toBe('test@example.com');
    expect(result.email).toBe('t****@example.com');
  });
});
