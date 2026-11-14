/**
 * @file 原生任务 BFF — /api/tasks/*（列表、创建、编辑、接取、提交、历史）。
 */
import { forwardToBackend } from '@/shared/bff-forward';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ path?: string[] }> };

export async function GET(req: Request, ctx: Ctx) {
  return forwardToBackend(req, ctx, 'GET', '/tasks');
}

export async function POST(req: Request, ctx: Ctx) {
  return forwardToBackend(req, ctx, 'POST', '/tasks');
}

export async function PATCH(req: Request, ctx: Ctx) {
  return forwardToBackend(req, ctx, 'PATCH', '/tasks');
}

export async function DELETE(req: Request, ctx: Ctx) {
  return forwardToBackend(req, ctx, 'DELETE', '/tasks');
}
