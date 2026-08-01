/**
 * @file 管理员博客管理 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/modules/admin/server';
import { publishPost, archivePost, deletePost } from '@/modules/community/server';
import { isAdminRole } from '@/shared/types';
import { assertAllowedOrigin, errorResponse } from '@/shared/security/security';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  const params = req.nextUrl.searchParams;
  const sub = params.get('sub');
  const body = await req.json();

  if (sub === 'publish') {
    try {
      const post = publishPost(admin.user.id, body.postId);
      return NextResponse.json({ post });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (sub === 'archive') {
    try {
      const post = archivePost(admin.user.id, body.postId);
      return NextResponse.json({ post });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (sub === 'delete') {
    try {
      deletePost(admin.user.id, body.postId, isAdminRole(admin.user.role));
      return NextResponse.json({ ok: true });
    } catch (e: unknown) {
      return errorResponse(e);
    }
  }

  return NextResponse.json({ error: '未知操作' }, { status: 400 });
}