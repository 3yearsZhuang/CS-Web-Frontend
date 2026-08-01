/**
 * @file 邮件发送服务 — nodemailer 发送，开发环境回退 console.log
 *
 * SMTP 凭据从环境变量读取不硬编码；邮件纯文本防 XSS。
 */
import nodemailer from 'nodemailer';
import 'server-only';

/**
 * SMTP transporter — SMTP_HOST 为空时返回 null（开发环境回退 console.log）
 *
 * macOS 上 Node 可能缺系统 CA 链导致 SMTP 报 "unable to get local issuer certificate"，
 * 设 SMTP_TLS_SKIP_VERIFY=true 可跳过（仅本地开发，生产用 NODE_EXTRA_CA_CERTS）。
 */
const transporter = (() => {
  const host = process.env.SMTP_HOST;
  if (!host) return null;

  const tlsSkipVerify = process.env.SMTP_TLS_SKIP_VERIFY === 'true';

  return nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS || '',
        }
      : undefined,
    tls: tlsSkipVerify
      ? { rejectUnauthorized: false }
      : undefined,
  });
})();

/** 发件人地址，优先读取环境变量 */
const SMTP_FROM = process.env.SMTP_FROM || 'no-reply@fztbu.example';

/** 发送纯文本邮件（transporter 为 null 时回退 console.log） */
async function sendMail(
  to: string,
  subject: string,
  text: string,
): Promise<void> {
  if (!transporter) {
    console.log(`[Mail] 验证码发送至 ${to}: ${text.match(/验证码是：(\d+)/)?.[1] ?? ''}`);
    return;
  }
  await transporter.sendMail({
    from: SMTP_FROM,
    to,
    subject,
    text,
  });
}

/** 发送 6 位注册验证码邮件（纯文本，含 10 分钟有效期提示） */
export async function sendVerificationCode(
  email: string,
  code: string,
): Promise<void> {
  const subject = '【FZTBU】注册验证码';
  const text = `您的注册验证码是：${code}

验证码有效期为 10 分钟，请尽快完成注册。

如非本人操作，请忽略此邮件。`;
  await sendMail(email, subject, text);
}
