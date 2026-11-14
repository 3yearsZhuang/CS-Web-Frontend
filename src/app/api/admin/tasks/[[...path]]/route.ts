/**
 * @file 管理员任务 BFF — /api/admin/tasks/*（待审核、上架审核、强制结项）。
 */
import { forwardToBackend } from '@/shared/bff-forward';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ path?: string[] }> };

export async function GET(req: Request, ctx: Ctx) {
  return forwardToBackend(req, ctx, 'GET', '/admin/tasks');
}

export async function POST(req: Request, ctx: Ctx) {
  return forwardToBackend(req, ctx, 'POST', '/admin/tasks');
}

export async function PATCH(req: Request, ctx: Ctx) {
  return forwardToBackend(req, ctx, 'PATCH', '/admin/tasks');
}

export async function DELETE(req: Request, ctx: Ctx) {
  return forwardToBackend(req, ctx, 'DELETE', '/admin/tasks');
}
