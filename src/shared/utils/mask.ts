/**
 * @file 敏感数据脱敏工具 — email/手机号/姓名/学号等 PII 字段掩码
 *
 * 纯函数无副作用，前后端同构可导入；空值安全。
 */

/** 邮箱脱敏：保留首字符与域名，中间 **** 填充 */
export function maskEmail(email: string | null | undefined): string | null | undefined {
  if (!email) return email === undefined ? undefined : null;
  const atIndex = email.indexOf('@');
  if (atIndex < 1) return '****';
  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex);
  const visibleLen = Math.min(local.length, 1);
  const masked = local.slice(0, visibleLen) + '****';
  return masked + domain;
}

/** 手机号脱敏：保留前 3 位与后 4 位 */
export function maskPhone(phone: string | null | undefined): string | null | undefined {
  if (!phone) return phone === undefined ? undefined : null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 7) return '****';
  return digits.slice(0, 3) + '****' + digits.slice(-4);
}

/** 姓名脱敏：保留姓氏首字，其余 * 填充 */
export function maskName(name: string | null | undefined): string | null | undefined {
  if (!name) return name === undefined ? undefined : null;
  if (name.length === 1) return '*';
  return name[0] + '*'.repeat(name.length - 1);
}

/** 学号脱敏：保留前 2 位与后 2 位 */
export function maskStudentId(id: string | null | undefined): string | null | undefined {
  if (!id) return id === undefined ? undefined : null;
  if (id.length <= 4) return '****';
  return id.slice(0, 2) + '****' + id.slice(-2);
}

/** 通用字符串脱敏：保留首尾各 1 字符（QQ 号等无固定格式标识符） */
export function maskString(value: string | null | undefined): string | null | undefined {
  if (!value) return value === undefined ? undefined : null;
  if (value.length <= 2) return '****';
  return value[0] + '****' + value[value.length - 1];
}

/** 递归脱敏对象中的敏感字段，根据 key 名自动选择策略（深拷贝不改原对象） */
export function maskSensitiveFields<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(maskSensitiveFields) as unknown as T;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (value === null || value === undefined) {
      result[key] = value;
      continue;
    }

    if (typeof value === 'object') {
      result[key] = maskSensitiveFields(value);
      continue;
    }

    if (typeof value === 'string') {
      const lowerKey = key.toLowerCase();
      if (lowerKey === 'email') {
        result[key] = maskEmail(value);
      } else if (
        lowerKey === 'phone' ||
        lowerKey === 'mobile' ||
        lowerKey === 'contactphone'
      ) {
        result[key] = maskPhone(value);
      } else if (
        lowerKey === 'name' ||
        lowerKey === 'applicantname' ||
        lowerKey === 'realname'
      ) {
        result[key] = maskName(value);
      } else if (lowerKey === 'studentid') {
        result[key] = maskStudentId(value);
      } else if (lowerKey === 'qq' || lowerKey === 'contactqq') {
        result[key] = maskString(value);
      } else {
        result[key] = value;
      }
    } else {
      result[key] = value;
    }
  }
  return result as T;
}
