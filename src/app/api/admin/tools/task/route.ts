/**
 * @file 管理员任务管理 API — GET/POST/PUT/DELETE /api/admin/tools/task
 *
 * GET:  获取所有任务（含 draft）
 * POST: 创建任务 / 发布 / 关闭 / 审核认领
 * PUT:  更新任务
 * DELETE: 删除任务
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireModuleAdmin, requirePasswordConfirmation } from '@/modules/admin/server';
import {
  createTask,
  updateTask,
  publishTask,
  closeTask,
  deleteTask,
  listTasks,
  listPendingClaims,
  reviewClaim,
} from '@/modules/tools/server';
import type { TaskStatus, TaskCategory } from '@/modules/tools/server';
import { assertAllowedOrigin, errorResponse } from '@/shared/security/security';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const admin = await requireModuleAdmin(req, 'task');
  if (!admin.ok) return admin.response;

  const params = req.nextUrl.searchParams;
  const sub = params.get('sub');

  if (sub === 'claims') {
    const pending = listPendingClaims();
    return NextResponse.json({ claims: pending });
  }

  if (sub === 'claim') {
    const claimId = params.get('id');
    if (!claimId) {
      return NextResponse.json({ error: '缺少认领 ID' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  const status = params.get('status') || undefined;
  const category = params.get('category') || undefined;
  const page = parseInt(params.get('page') || '1', 10);
  const pageSize = parseInt(params.get('pageSize') || '20', 10);

  const result = listTasks({
    status: status as TaskStatus | undefined,
    category: category as TaskCategory | undefined,
    page,
    pageSize: Math.min(pageSize, 50),
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;
  const admin = await requireModuleAdmin(req, 'task');
  if (!admin.ok) return admin.response;

  const params = req.nextUrl.searchParams;
  const sub = params.get('sub');

  if (sub === 'claim') {
    const body = await req.json();
    const { claimId, approved, note } = body;
    if (!claimId) {
      return NextResponse.json({ error: '缺少认领 ID' }, { status: 400 });
    }
    try {
      const result = await reviewClaim(admin.user.id, claimId, approved === true, note);
      return NextResponse.json({ claim: result });
    } catch (e: unknown) {
      return errorResponse(e);
    }
  }

  if (sub === 'publish') {
    const body = await req.json();
    const { taskId } = body;
    if (!taskId) {
      return NextResponse.json({ error: '缺少任务 ID' }, { status: 400 });
    }
    try {
      const task = await publishTask(admin.user.id, taskId);
      return NextResponse.json({ task });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  if (sub === 'close') {
    const body = await req.json();
    const { taskId } = body;
    if (!taskId) {
      return NextResponse.json({ error: '缺少任务 ID' }, { status: 400 });
    }
    try {
      const task = await closeTask(admin.user.id, taskId);
      return NextResponse.json({ task });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const body = await req.json();
  try {
    const task = await createTask(admin.user.id, body);
    return NextResponse.json({ task }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'VALIDATION_ERROR') {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}

export async function PUT(req: NextRequest) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;
  const admin = await requireModuleAdmin(req, 'task');
  if (!admin.ok) return admin.response;

  const body = await req.json();
  const { taskId, ...input } = body;

  if (!taskId) {
    return NextResponse.json({ error: '缺少任务 ID' }, { status: 400 });
  }

  try {
    const task = await updateTask(admin.user.id, taskId, input);
    return NextResponse.json({ task });
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'NOT_FOUND') {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    if (e instanceof Error && e.name === 'VALIDATION_ERROR') {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
}

export async function DELETE(req: NextRequest) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;
  const admin = await requireModuleAdmin(req, 'task');
  if (!admin.ok) return admin.response;

  const body = await req.json();
  const passwordResult = await requirePasswordConfirmation(req, body.password || '');
  if (!passwordResult.ok) return passwordResult.response;

  const params = req.nextUrl.searchParams;
  const taskId = params.get('id');

  if (!taskId) {
    return NextResponse.json({ error: '缺少任务 ID' }, { status: 400 });
  }

  try {
    await deleteTask(admin.user.id, taskId);
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'NOT_FOUND') {
      return NextResponse.json({ error: e.message }, { status: 404 });
    }
    throw e;
  }
}
