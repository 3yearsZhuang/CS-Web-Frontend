/**
 * @file 开发文档详情 API
 *
 * GET    /api/dev-docs/[slug]  — 读取文档内容（admin+ 只读）
 * PUT    /api/dev-docs/[slug]  — 写入文档内容（root 专属）
 * DELETE /api/dev-docs/[slug]  — 删除文档（root 专属）
 */

import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { requireAdmin, requireRoot } from '@/modules/admin/server';
import { logAdminAction } from '@/shared/security/audit';
import {
  parseJsonBody,
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  adminActionsLimiter,
} from '@/shared/security/security';

export const runtime = 'nodejs';

const DOCS_DIR = path.resolve(process.cwd(), 'tools/docs');

/**
 * 安全解析 slug 为绝对路径，阻止路径穿越。
 * 只允许 tools/docs 下的 .md 文件，slug 不能包含 / 或 ..
 */
function resolveDocPath(slug: string): string | null {
  if (!slug || slug.includes('/') || slug.includes('..') || slug.includes('\\')) {
    return null;
  }
  const filename = slug.endsWith('.md') ? slug : `${slug}.md`;
  const fullPath = path.join(DOCS_DIR, filename);
  const normalized = path.normalize(fullPath);
  // 确保解析后的路径仍在 DOCS_DIR 内
  if (!normalized.startsWith(DOCS_DIR + path.sep) && normalized !== DOCS_DIR) {
    return null;
  }
  return normalized;
}

/** GET — 读取文档内容（admin+） */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const { slug } = await params;
  const filePath = resolveDocPath(slug);
  if (!filePath) {
    return jsonError('无效的文档标识', 400);
  }

  if (!fs.existsSync(filePath)) {
    return jsonError('文档不存在', 404);
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const stat = fs.statSync(filePath);
    return NextResponse.json({
      slug,
      content,
      modified: stat.mtime.toISOString(),
      readOnly: admin.user.role !== 'root',
    });
  } catch {
    return jsonError('读取文档失败', 500);
  }
}

/** PUT — 写入文档内容（root 专属） */
export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const root = requireRoot(req);
  if (!root.ok) return root.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`dev-docs-write:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const { slug } = await params;
  const filePath = resolveDocPath(slug);
  if (!filePath) {
    return jsonError('无效的文档标识', 400);
  }

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const body = parsed.body as { content?: string };
  if (typeof body.content !== 'string' || body.content.length === 0) {
    return jsonError('内容不能为空', 400);
  }

  // 限制单文档最大 1MB，防止过大写入
  if (body.content.length > 1024 * 1024) {
    return jsonError('文档内容过大（限制 1MB）', 413);
  }

  try {
    fs.writeFileSync(filePath, body.content, 'utf-8');
    logAdminAction(root.user.id, 'dev-docs.update', null, { slug, size: body.content.length }, ip, req.headers.get('user-agent'));
    return NextResponse.json({ ok: true, slug });
  } catch {
    return jsonError('写入文档失败', 500);
  }
}

/** DELETE — 删除文档（root 专属） */
export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const root = requireRoot(req);
  if (!root.ok) return root.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const { slug } = await params;
  const filePath = resolveDocPath(slug);
  if (!filePath) {
    return jsonError('无效的文档标识', 400);
  }

  if (!fs.existsSync(filePath)) {
    return jsonError('文档不存在', 404);
  }

  try {
    fs.unlinkSync(filePath);
    const ip = getClientIp(req);
    logAdminAction(root.user.id, 'dev-docs.delete', null, { slug }, ip, req.headers.get('user-agent'));
    return NextResponse.json({ ok: true, slug });
  } catch {
    return jsonError('删除文档失败', 500);
  }
}
