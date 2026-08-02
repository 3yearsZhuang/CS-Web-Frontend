/**
 * @file TOTP 双因素认证集成测试
 *
 * 覆盖 src/server/totp.ts 的核心逻辑：
 *   - TOTP secret 生成与验证
 *   - Base32 编解码
 *   - backup codes 生成与消费
 *   - setup → confirm → verify → disable 完整流程
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import crypto from 'node:crypto';

// 内存数据库
const inMemoryDb = new Database(':memory:');

// mock db 模块（新 totp.ts 通过 @/shared/db 引用）
vi.mock('@/shared/db', () => ({
  getDb: () => inMemoryDb,
  __esModule: true,
}));

// mock auth/identity（新 totp.ts 通过 ./identity 引用，即 @/modules/auth/server/identity）
vi.mock('@/modules/auth/server/identity', () => ({
  hashPassword: (s: string) => `salt:${s}`,
  verifyPassword: (s: string, stored: string) => stored === `salt:${s}`,
  __esModule: true,
}));

import {
  generateTOTPSecret,
  generateOTPAuthURI,
  verifyTOTPCode,
  generateBackupCodes,
  setup2FA,
  confirm2FA,
  verify2FA,
  disable2FA,
  is2FAEnabled,
  regenerateBackupCodes,
} from '@/modules/auth/server/totp';

/** 辅助：生成当前时间窗口的 TOTP 码（复用 totp.ts 内部算法） */
function generateCurrentCode(secret: string): string {
  const STEP_SECONDS = 30;
  const DIGITS = 6;
  const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

  function base32Decode(encoded: string): Buffer {
    const cleaned = encoded.replace(/=+$/, '').toUpperCase();
    const bytes: number[] = [];
    let bits = 0;
    let value = 0;
    for (const char of cleaned) {
      const idx = BASE32_ALPHABET.indexOf(char);
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 0xff);
        bits -= 8;
      }
    }
    return Buffer.from(bytes);
  }

  const counter = Math.floor(Date.now() / 1000 / STEP_SECONDS);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const key = base32Decode(secret);
  const hmac = crypto.createHmac('sha1', key).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    (((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff)) %
    10 ** DIGITS;
  return code.toString().padStart(DIGITS, '0');
}

describe('TOTP 核心算法', () => {
  it('应生成 32 字符的 base32 secret', () => {
    const secret = generateTOTPSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
  });

  it('应生成正确的 otpauth URI', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const uri = generateOTPAuthURI('test@example.com', secret);
    expect(uri).toContain('otpauth://totp/');
    expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
    expect(uri).toContain('issuer=FZTBUCS');
  });

  it('应验证正确的 TOTP 码', () => {
    const secret = generateTOTPSecret();
    const code = generateCurrentCode(secret);
    expect(verifyTOTPCode(secret, code)).toBe(true);
  });

  it('应拒绝错误的 TOTP 码', () => {
    const secret = generateTOTPSecret();
    expect(verifyTOTPCode(secret, '000000')).toBe(false);
  });

  it('应拒绝格式错误的码', () => {
    const secret = generateTOTPSecret();
    expect(verifyTOTPCode(secret, 'abc123')).toBe(false);
    expect(verifyTOTPCode(secret, '12345')).toBe(false);
    expect(verifyTOTPCode(secret, '1234567')).toBe(false);
  });
});

describe('Backup codes', () => {
  it('应生成 8 个格式正确的备用码', () => {
    const codes = generateBackupCodes();
    expect(codes).toHaveLength(8);
    codes.forEach((code: string) => {
      expect(code).toMatch(/^[A-Z0-9]{5}-[A-Z0-9]{5}$/);
    });
  });

  it('每次生成的备用码应不同', () => {
    const codes1 = generateBackupCodes();
    const codes2 = generateBackupCodes();
    expect(codes1).not.toEqual(codes2);
  });
});

describe('2FA 完整流程', () => {
  const testUserId = 'test-user-2fa';
  const testEmail = 'test2fa@example.com';

  beforeEach(() => {
    inMemoryDb.exec('DROP TABLE IF EXISTS two_factor_auth');
    inMemoryDb.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL
      );
    `);
    inMemoryDb.exec(`
      CREATE TABLE IF NOT EXISTS two_factor_auth (
        user_id TEXT PRIMARY KEY,
        secret_encrypted TEXT NOT NULL,
        backup_codes TEXT NOT NULL DEFAULT '[]',
        enabled INTEGER NOT NULL DEFAULT 0,
        enabled_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);
    // 插入测试用户（外键约束）
    inMemoryDb.prepare('INSERT OR IGNORE INTO users (id, email) VALUES (?, ?)').run(testUserId, testEmail);
  });

  it('setup → confirm → verify → disable 完整流程', async () => {
    // 1. setup
    const setup = await setup2FA(testUserId, testEmail);
    expect(setup.secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(setup.otpauthURI).toContain('otpauth://totp/');
    expect(setup.backupCodes).toHaveLength(8);
    expect(await is2FAEnabled(testUserId)).toBe(false);

    // 2. confirm
    const code = generateCurrentCode(setup.secret);
    const confirmResult = await confirm2FA(testUserId, code);
    expect(confirmResult.ok).toBe(true);
    expect(await is2FAEnabled(testUserId)).toBe(true);

    // 3. verify with correct code
    const code2 = generateCurrentCode(setup.secret);
    expect(await verify2FA(testUserId, code2)).toBe(true);

    // 4. verify with backup code
    expect(await verify2FA(testUserId, setup.backupCodes[0])).toBe(true);
    // 备用码使用后应失效
    expect(await verify2FA(testUserId, setup.backupCodes[0])).toBe(false);

    // 5. disable
    const code3 = generateCurrentCode(setup.secret);
    const disableResult = await disable2FA(testUserId, code3);
    expect(disableResult.ok).toBe(true);
    expect(await is2FAEnabled(testUserId)).toBe(false);
  });

  it('未启用 2FA 时 verify 应直接放行', async () => {
    expect(await verify2FA('nonexistent-user', '123456')).toBe(true);
  });

  it('confirm 时错误码应失败', async () => {
    setup2FA(testUserId, testEmail);
    const result = await confirm2FA(testUserId, '000000');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('验证码错误');
  });

  it('regenerateBackupCodes 应返回新备用码', async () => {
    const setup = await setup2FA(testUserId, testEmail);
    const code = generateCurrentCode(setup.secret);
    confirm2FA(testUserId, code);

    const code2 = generateCurrentCode(setup.secret);
    const result = await regenerateBackupCodes(testUserId, code2);
    expect(result.ok).toBe(true);
    expect(result.codes).toHaveLength(8);
    expect(result.codes).not.toEqual(setup.backupCodes);
  });
});
