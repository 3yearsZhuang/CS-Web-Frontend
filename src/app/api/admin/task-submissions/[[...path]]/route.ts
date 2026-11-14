/**
 * @file 管理员成果验收 BFF — /api/admin/task-submissions/*。
 */
import { forwardToBackend } from '@/shared/bff-forward';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ path?: string[] }> };

export async function GET(req: Request, ctx: Ctx) {
  return forwardToBackend(req, ctx, 'GET', '/admin/task-submissions');
}

export async function POST(req: Request, ctx: Ctx) {
  return forwardToBackend(req, ctx, 'POST', '/admin/task-submissions');
}
