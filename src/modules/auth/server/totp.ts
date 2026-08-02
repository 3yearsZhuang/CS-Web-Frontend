/**
 * @file TOTP 双因素认证服务层 — 基于 RFC 6238 自实现，secret 加密存储（ADR-009 async）
 */

import crypto from 'node:crypto';
import { logger } from '@/shared/logger';
import { hashPassword, verifyPassword } from '@/shared/security/password';
import { getDbEngine, type DbEngine } from '@/shared/db/drivers';
import { getAuthRepository } from '@/shared/db/repositories/auth.repo';

// ============ TOTP 核心算法 ============

const STEP_SECONDS = 30;
const DIGITS = 6;
const SECRET_LENGTH = 20; // 160 bits

/** Base32 编码（RFC 4648） */
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Encode(buffer: Buffer): string {
  let result = '';
  let bits = 0;
  let value = 0;

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    result += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return result;
}

/** Base32 解码 */
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

/** 生成随机 TOTP secret */
export function generateTOTPSecret(): string {
  const bytes = crypto.randomBytes(SECRET_LENGTH);
  return base32Encode(bytes);
}

/** 生成 otpauth:// URI（用于二维码） */
export function generateOTPAuthURI(email: string, secret: string, issuer = 'FZTBUCS'): string {
  const label = encodeURIComponent(`${issuer}:${email}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: String(DIGITS),
    period: String(STEP_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/** 生成当前 TOTP 码 */
function generateTOTPCode(secret: string, timestamp: number = Date.now()): string {
  const counter = Math.floor(timestamp / 1000 / STEP_SECONDS);
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

/** 验证 TOTP 码（允许 ±1 窗口） */
export function verifyTOTPCode(secret: string, code: string): boolean {
  if (!/^\d{6}$/.test(code)) return false;
  const now = Date.now();
  for (let offset = -1; offset <= 1; offset++) {
    const expected = generateTOTPCode(secret, now + offset * STEP_SECONDS * 1000);
    if (crypto.timingSafeEqual(Buffer.from(code), Buffer.from(expected))) {
      return true;
    }
  }
  return false;
}

// ============ Secret 加密存储 ============

/**
 * TOTP secret 加密密钥 — 优先 TOTP_ENCRYPTION_KEY；开发环境回退到 globalThis 缓存的随机密钥，
 * 避免 Next.js dev 热重载导致密钥不一致。生产环境必须独立设置（≥32 字节），与 session 密钥解耦。
 */
const TOTP_KEY_MATERIAL = process.env.TOTP_ENCRYPTION_KEY || (() => {
  const key = '__FZTBU_TOTP_KEY__';
  const g = globalThis as Record<string, unknown>;
  if (typeof g[key] === 'string') return g[key] as string;
  const secret = crypto.randomBytes(32).toString('hex');
  g[key] = secret;
  return secret;
})();

if (!process.env.TOTP_ENCRYPTION_KEY && process.env.NODE_ENV === 'production') {
  console.error(
    '[FATAL] TOTP_ENCRYPTION_KEY 环境变量未设置。生产环境必须设置此变量作为 TOTP secret 加密密钥。\n' +
    '  缺失将导致：进程重启后已加密的 TOTP secret 无法解密，2FA 全部失效。\n' +
    '  示例: TOTP_ENCRYPTION_KEY=<32+ 字节随机字符串>'
  );
  process.exit(1);
}

/** 使用 HKDF-SHA256 从主密钥派生 AES-256 密钥（固定 info 串绑定用途，防跨域复用） */
function getKeyBuffer(): Buffer {
  const derived = crypto.hkdfSync('sha256', TOTP_KEY_MATERIAL, '', 'fztbucs-totp-encryption', 32);
  return Buffer.from(derived);
}

function encryptSecret(secret: string): string {
  const keyBuffer = getKeyBuffer();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptSecret(encrypted: string): string {
  const keyBuffer = getKeyBuffer();
  const [ivHex, tagHex, dataHex] = encrypted.split(':');
  if (!ivHex || !tagHex || !dataHex) throw new Error('Invalid encrypted secret format');
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const data = Buffer.from(dataHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString('utf8');
}

// ============ Backup Codes ============

/** 生成 8 个一次性备用码 */
export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const code = crypto.randomBytes(5).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 5)}-${code.slice(5)}`);
  }
  return codes;
}

/** 哈希备用码 */
function hashBackupCode(code: string): string {
  return hashPassword(code);
}

/** 验证备用码 */
function verifyBackupCode(code: string, stored: string): boolean {
  return verifyPassword(code, stored);
}

// ============ 数据库操作 ============

interface TwoFactorRow {
  user_id: string;
  secret_encrypted: string;
  backup_codes: string;
  enabled: number;
  enabled_at: string | null;
  created_at: string;
  updated_at: string;
}

/** 确保表存在（DDL，幂等） */
async function ensureTable(): Promise<void> {
  const engine: DbEngine = await getDbEngine();
  await engine.execute(`
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
}

/** 检查用户是否启用了 2FA */
export async function is2FAEnabled(userId: string): Promise<boolean> {
  await ensureTable();
  const repo = await getAuthRepository();
  const row = await repo.findTwoFactor(userId);
  return row?.enabled === 1;
}

/** 初始化 2FA 设置（生成 secret + backup codes，但未启用） */
export async function setup2FA(userId: string, email: string): Promise<{
  secret: string;
  otpauthURI: string;
  backupCodes: string[];
}> {
  await ensureTable();
  const repo = await getAuthRepository();

  const secret = generateTOTPSecret();
  const otpauthURI = generateOTPAuthURI(email, secret);
  const backupCodes = generateBackupCodes();
  const hashedBackupCodes = backupCodes.map(hashBackupCode);
  const encryptedSecret = encryptSecret(secret);

  await repo.upsertTwoFactor({
    userId,
    secretEncrypted: encryptedSecret,
    backupCodes: JSON.stringify(hashedBackupCodes),
  });

  return { secret, otpauthURI, backupCodes };
}

/** 确认启用 2FA（验证 TOTP 码后激活） */
export async function confirm2FA(userId: string, code: string): Promise<{ ok: boolean; error?: string }> {
  await ensureTable();
  const repo = await getAuthRepository();

  const row = await repo.findTwoFactor(userId);
  if (!row) {
    return { ok: false, error: '请先初始化 2FA 设置' };
  }
  if (row.enabled === 1) {
    return { ok: false, error: '2FA 已启用' };
  }

  const secret = decryptSecret(row.secret_encrypted);
  if (!verifyTOTPCode(secret, code)) {
    return { ok: false, error: '验证码错误' };
  }

  await repo.enableTwoFactor(userId);

  return { ok: true };
}

/** 验证 TOTP 码或备用码（登录时调用） */
export async function verify2FA(userId: string, code: string): Promise<boolean> {
  await ensureTable();
  const repo = await getAuthRepository();

  const row = await repo.findTwoFactor(userId);
  if (!row) return true; // 未启用 2FA，直接放行

  const secret = decryptSecret(row.secret_encrypted);
  if (verifyTOTPCode(secret, code)) {
    return true;
  }

  let backupCodes: string[] = [];
  try {
    backupCodes = JSON.parse(row.backup_codes) as string[];
  } catch { /* ignore */ }

  for (let i = 0; i < backupCodes.length; i++) {
    if (verifyBackupCode(code, backupCodes[i])) {
      // 使用后删除该备用码
      backupCodes.splice(i, 1);
      await repo.updateTwoFactorBackupCodes(userId, JSON.stringify(backupCodes));
      return true;
    }
  }

  return false;
}

/** 禁用 2FA（需要验证码） */
export async function disable2FA(userId: string, code: string): Promise<{ ok: boolean; error?: string }> {
  await ensureTable();
  const repo = await getAuthRepository();

  if (!(await verify2FA(userId, code))) {
    return { ok: false, error: '验证码错误' };
  }

  await repo.deleteTwoFactor(userId);
  return { ok: true };
}

/** 重新生成备用码（需要验证当前 TOTP） */
export async function regenerateBackupCodes(userId: string, code: string): Promise<{ ok: boolean; codes?: string[]; error?: string }> {
  await ensureTable();
  const repo = await getAuthRepository();

  if (!(await verify2FA(userId, code))) {
    return { ok: false, error: '验证码错误' };
  }

  const newCodes = generateBackupCodes();
  const hashed = newCodes.map(hashBackupCode);

  await repo.updateTwoFactorBackupCodes(userId, JSON.stringify(hashed));

  return { ok: true, codes: newCodes };
}

/** 检查管理员（admin 角色，不含 root）是否需要强制启用 2FA */
export function require2FAForAdmin(role: string): boolean {
  return role === 'admin';
}
