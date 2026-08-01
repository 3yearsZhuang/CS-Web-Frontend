/**
 * @file GitHub OAuth 登录服务 — 基于 Node.js 内置 crypto/https，不依赖第三方库
 */

import crypto from 'node:crypto';
import https from 'node:https';
import { AppError } from '@/shared/app-error';
import { getDb } from '@/shared/db';
import { hashPassword } from '@/shared/security/password';
import { toSafeUser, type UserRow } from '@/shared/types';

/** state 有效期（毫秒）— 10 分钟 */
const STATE_TTL_MS = 10 * 60 * 1000;

/** 默认回调地址 */
const DEFAULT_CALLBACK_URL = 'http://localhost:2333/api/auth/oauth/github/callback';

/** 内存存储 state — Map<state, expiresAt> */
const stateStore = new Map<string, number>();

/** 定期清理过期 state，防内存泄漏（每 5 分钟扫描） */
setInterval(() => {
  const now = Date.now();
  for (const [state, expiresAt] of stateStore) {
    if (expiresAt < now) {
      stateStore.delete(state);
    }
  }
}, 5 * 60 * 1000).unref();

/** 生成 OAuth state（32 字节随机 hex）防 CSRF，存入内存 Map，10 分钟过期 */
export function generateOAuthState(): { state: string; expiresAt: number } {
  const state = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + STATE_TTL_MS;
  stateStore.set(state, expiresAt);
  return { state, expiresAt };
}

/** 构造 GitHub 授权 URL — GITHUB_CLIENT_ID 未配置时返回 null */
export function getGitHubAuthUrl(): string | null {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) return null;

  const callbackUrl = process.env.GITHUB_CALLBACK_URL || DEFAULT_CALLBACK_URL;
  const { state } = generateOAuthState();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: 'user:email',
    state,
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/** HTTPS POST 请求，返回解析后的 JSON（基于 Node.js 内置 https） */
function httpsPost<T = unknown>(
  hostname: string,
  path: string,
  data: Record<string, string>,
  headers: Record<string, string> = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams(data).toString();

    const options: https.RequestOptions = {
      hostname,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        Accept: 'application/json',
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body) as T);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

/** HTTPS GET 请求，返回解析后的 JSON（基于 Node.js 内置 https） */
function httpsGet<T = unknown>(
  hostname: string,
  path: string,
  headers: Record<string, string> = {},
): Promise<T> {
  return new Promise((resolve, reject) => {
    const options: https.RequestOptions = {
      hostname,
      path,
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...headers,
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body) as T);
        } catch (err) {
          reject(err);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

/** GitHub 用户信息响应 */
interface GitHubUser {
  id: number;
  login: string;
  email: string | null;
  name: string | null;
  avatar_url: string;
  html_url: string;
}

/** GitHub 邮箱信息响应 */
interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: string | null;
}

/** 校验 state — 必须存在且未过期，校验后立即删除（一次性）；失败抛 STATE_INVALID / STATE_EXPIRED */
function verifyState(state: string): void {
  const expiresAt = stateStore.get(state);
  if (!expiresAt) {
    throw new AppError('STATE_INVALID', 'STATE_INVALID');
  }

  stateStore.delete(state);

  if (expiresAt < Date.now()) {
    throw new AppError('STATE_EXPIRED', 'STATE_EXPIRED');
  }
}

/** 用 code 向 GitHub 换取 access_token — 失败抛 OAUTH_ERROR */
async function exchangeCodeForToken(code: string): Promise<string> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  const callbackUrl = process.env.GITHUB_CALLBACK_URL || DEFAULT_CALLBACK_URL;

  if (!clientId || !clientSecret) {
    throw new AppError('OAUTH_ERROR', 'OAUTH_ERROR');
  }

  const response = await httpsPost<{ access_token?: string; error?: string }>(
    'github.com',
    '/login/oauth/access_token',
    {
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: callbackUrl,
    },
  );

  if (!response.access_token || response.error) {
    throw new AppError('OAUTH_ERROR', 'OAUTH_ERROR');
  }

  return response.access_token;
}

/** 用 access_token 获取 GitHub 用户信息 — 失败抛 OAUTH_ERROR */
async function fetchGitHubUser(accessToken: string): Promise<GitHubUser> {
  try {
    const user = await httpsGet<GitHubUser>(
      'api.github.com',
      '/user',
      {
        Authorization: `token ${accessToken}`,
        'User-Agent': 'fztbucs-oauth',
      },
    );
    return user;
  } catch {
    throw new AppError('OAUTH_ERROR', 'OAUTH_ERROR');
  }
}

/** 用 access_token 获取主邮箱（优先 primary 且 verified）— 失败抛 OAUTH_ERROR */
async function fetchPrimaryEmail(accessToken: string): Promise<string> {
  try {
    const emails = await httpsGet<GitHubEmail[]>(
      'api.github.com',
      '/user/emails',
      {
        Authorization: `token ${accessToken}`,
        'User-Agent': 'fztbucs-oauth',
      },
    );

    const primaryVerified = emails.find((e) => e.primary && e.verified);
    if (primaryVerified) return primaryVerified.email;

    const anyVerified = emails.find((e) => e.verified);
    if (anyVerified) return anyVerified.email;

    throw new AppError('OAUTH_ERROR', 'OAUTH_ERROR');
  } catch {
    throw new AppError('OAUTH_ERROR', 'OAUTH_ERROR');
  }
}

/** 验证 GitHub OAuth 回调，完成登录/注册 — state 无效抛 STATE_INVALID/STATE_EXPIRED，OAuth 错误抛 OAUTH_ERROR；邮箱已注册时不自动绑定（防接管） */
export async function verifyGitHubCallback(
  code: string,
  state: string,
): Promise<{ userId: string; isNewUser: boolean; autoBound: boolean; email: string }> {
  verifyState(state);

  const accessToken = await exchangeCodeForToken(code);
  const githubUser = await fetchGitHubUser(accessToken);
  const email = await fetchPrimaryEmail(accessToken);

  const db = getDb();
  const githubId = String(githubUser.id);

  const existingByGithubId = db
    .prepare('SELECT * FROM users WHERE github_id = ?')
    .get(githubId) as UserRow | undefined;

  if (existingByGithubId) {
    return {
      userId: existingByGithubId.id,
      isNewUser: false,
      autoBound: false,
      email: existingByGithubId.email,
    };
  }

  const existingByEmail = db
    .prepare('SELECT * FROM users WHERE email = ?')
    .get(email.toLowerCase()) as UserRow | undefined;

  if (existingByEmail) {
    // 安全：不再自动绑定 — GitHub verified 邮箱只证明邮箱在 GitHub 侧受控，
    // 不等于本地账号所有者本人。自动绑定存在账号接管风险。
    // 引导用户用密码登录后在个人设置手动绑定 GitHub。
    throw new AppError('GITHUB_EMAIL_CONFLICT', 'GITHUB_EMAIL_CONFLICT');
  }

  const randomPassword = crypto.randomBytes(16).toString('hex');
  const id = crypto.randomUUID();
  const passwordHash = hashPassword(randomPassword);

  db.prepare(
    'INSERT INTO users (id, email, password_hash, github_id, display_name, avatar_url, github_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(
    id,
    email.toLowerCase(),
    passwordHash,
    githubId,
    githubUser.name || githubUser.login,
    githubUser.avatar_url,
    githubUser.html_url,
  );

  const newUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow;
  toSafeUser(newUser);

  return {
    userId: id,
    isNewUser: true,
    autoBound: false,
    email,
  };
}

/** 解除用户 GitHub 绑定 — 用户不存在抛 NOT_FOUND */
export function unlinkGitHub(userId: string): void {
  const db = getDb();

  const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(userId) as
    | { id: string }
    | undefined;

  if (!existing) {
    throw new AppError('NOT_FOUND', 'NOT_FOUND');
  }

  db.prepare('UPDATE users SET github_id = NULL, updated_at = datetime(\'now\') WHERE id = ?').run(
    userId,
  );
}