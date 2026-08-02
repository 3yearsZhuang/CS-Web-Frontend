/**
 * @file GitHub OAuth 授权跳转 API 路由 — GET /api/auth/oauth/github
 *
 * 生成 GitHub 授权 URL 并重定向用户到 GitHub 授权页面。
 * 若 GitHub OAuth 环境变量未配置，则返回 404。
 *
 * 安全控制：
 *   - 生成防 CSRF 的 state 参数并存入内存（generateOAuthState 内部处理）
 *   - state 一次性使用，10 分钟有效
 */
import { NextResponse } from 'next/server';
import { getGitHubAuthUrl } from '@/modules/auth/server';

export const runtime = 'nodejs';

export async function GET() {
  const authUrl = await getGitHubAuthUrl();

  if (!authUrl) {
    return NextResponse.json({ error: 'GitHub 登录未启用', code: 'NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.redirect(authUrl, { status: 302 });
}