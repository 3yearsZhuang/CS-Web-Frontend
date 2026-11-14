/**
 * @file 财务 BFF — /api/admin/finance/*（Cookie 身份 + 路径白名单）。
 */
import { forwardToBackend } from '@/shared/bff-forward';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ path?: string[] }> };

export async function GET(req: Request, ctx: Ctx) {
  return forwardToBackend(req, ctx, 'GET', '/admin/finance');
}

export async function POST(req: Request, ctx: Ctx) {
  return forwardToBackend(req, ctx, 'POST', '/admin/finance');
}
