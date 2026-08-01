/**
 * @file 开发文档 API - GET /api/dev-docs
 *
 * 列出 tools/docs 下所有 .md 文档（admin+ 只读）
 */

import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { requireAdmin } from '@/modules/admin/server';
import {
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  adminActionsLimiter,
} from '@/shared/security/security';

export const runtime = 'nodejs';

const DOCS_DIR = path.resolve(process.cwd(), 'tools/docs');

/** 从文件第一行 `# 标题` 提取标题，失败返回文件名 */
function extractTitle(filePath: string, fallback: string): string {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const match = content.match(/^#\s+(.+)$/m);
    return match?.[1]?.trim() || fallback;
  } catch {
    return fallback;
  }
}

export async function GET(req: Request) {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`dev-docs-list:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  try {
    const files = fs
      .readdirSync(DOCS_DIR)
      .filter((f) => f.endsWith('.md'))
      .sort();

    const docs = files.map((f) => {
      const fullPath = path.join(DOCS_DIR, f);
      const stat = fs.statSync(fullPath);
      return {
        slug: f.replace(/\.md$/, ''),
        title: extractTitle(fullPath, f),
        size: stat.size,
        modified: stat.mtime.toISOString(),
      };
    });

    return NextResponse.json(docs);
  } catch {
    return jsonError('读取文档列表失败', 500);
  }
}
