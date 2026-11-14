/**
 * @file 组织管理 BFF — /api/admin/organization/*（成员与峰写操作、审计历史读取）。
 */
import { forwardToBackend } from '@/shared/bff-forward';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ path?: string[] }> };

export async function GET(req: Request, ctx: Ctx) {
  return forwardToBackend(req, ctx, 'GET', '/admin/organization');
}

export async function POST(req: Request, ctx: Ctx) {
  return forwardToBackend(req, ctx, 'POST', '/admin/organization');
}

export async function PATCH(req: Request, ctx: Ctx) {
  return forwardToBackend(req, ctx, 'PATCH', '/admin/organization');
}
