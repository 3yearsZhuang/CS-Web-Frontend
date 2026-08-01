/**
 * @file 注册验证码服务 — 6 位数字，HMAC-SHA256 哈希存储，10 分钟有效
 *
 * 用 HMAC 而非 scrypt 避免 DoS 放大（验证码空间小 + 速率限制已足够）。
 */
import crypto from 'node:crypto';
import { getDb, cleanupExpiredData } from '@/shared/db';
import { sendVerificationCode } from '@/shared/utils/mail';

/**
 * HMAC 签名密钥 — 复用 AUTH_SESSION_SECRET，未设置时用 globalThis 缓存的随机密钥；
 * DB 泄露也无法从 HMAC 反推验证码。
 */
const CODE_HMAC_SECRET = process.env.AUTH_SESSION_SECRET || (() => {
  const key = '__FZTBU_CODE_HMAC_SECRET__';
  const g = globalThis as Record<string, unknown>;
  if (typeof g[key] === 'string') return g[key] as string;
  const secret = crypto.randomBytes(32).toString('hex');
  g[key] = secret;
  return secret;
})();

/** 验证码记录行结构 */
interface VerificationCodeRow {
  id: string;
  email: string;
  code_hash: string;
  expires_at: string;
  used: number;
  created_at: string;
}

/** 使用 HMAC-SHA256 哈希验证码，返回 HMAC hex */
function hashCode(code: string): string {
  return crypto.createHmac('sha256', CODE_HMAC_SECRET).update(code).digest('hex');
}

/** 校验验证码是否匹配哈希（恒定时间比较） */
function verifyHashCode(code: string, stored: string): boolean {
  const actual = hashCode(code);
  if (actual.length !== stored.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(stored));
  } catch {
    return false;
  }
}

/** 生成 6 位随机数字验证码 — 旧码失效、哈希存储 10 分钟有效、发送邮件；返回明文仅用于日志 */
export async function generateCode(email: string): Promise<string> {
  const db = getDb();
  const normalizedEmail = email.toLowerCase();

  cleanupExpiredData(db);

  db.prepare(
    'UPDATE verification_codes SET used = 1 WHERE email = ? AND used = 0',
  ).run(normalizedEmail);

  const code = String(crypto.randomInt(100000, 1000000));

  const id = crypto.randomUUID();
  const codeHash = hashCode(code);
  db.prepare(
    `INSERT INTO verification_codes (id, email, code_hash, expires_at)
     VALUES (?, ?, ?, datetime('now', '+10 minutes'))`,
  ).run(id, normalizedEmail, codeHash);

  await sendVerificationCode(normalizedEmail, code);

  return code;
}

/** 校验验证码 — 自动清理过期码，成功后标记 used 防重放 */
export function verifyCode(email: string, code: string): boolean {
  const db = getDb();
  const normalizedEmail = email.toLowerCase();

  db.prepare(
    "DELETE FROM verification_codes WHERE expires_at < datetime('now')",
  ).run();

  const row = db
    .prepare(
      `SELECT * FROM verification_codes
       WHERE email = ? AND used = 0 AND expires_at > datetime('now')
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(normalizedEmail) as VerificationCodeRow | undefined;

  if (!row) return false;

  const ok = verifyHashCode(code, row.code_hash);
  if (!ok) return false;

  db.prepare('UPDATE verification_codes SET used = 1 WHERE id = ?').run(row.id);
  return true;
}
