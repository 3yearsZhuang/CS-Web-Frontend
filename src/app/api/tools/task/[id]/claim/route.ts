/**
 * @file 任务认领 API — POST / DELETE /api/tools/task/[id]/claim
 */
import { NextResponse } from 'next/server';
import { getSession } from '@/modules/auth/server';
import { claimTask, cancelClaimByTask } from '@/modules/tools/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import { getCookieValue, assertAllowedOrigin, errorResponse } from '@/shared/security/security';

export const runtime = 'nodejs';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;
  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const session = getSession(token);
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const { id } = await params;

  try {
    let body: { note?: string } = {};
    try {
      body = await req.json();
    } catch { /* no body */ }

    const result = claimTask(session.user.id, id, body.note);
    return NextResponse.json({ claim: result });
  } catch (e: unknown) {
    return errorResponse(e);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;
  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const session = getSession(token);
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const { id } = await params;

  try {
    cancelClaimByTask(session.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return errorResponse(e);
  }
}
