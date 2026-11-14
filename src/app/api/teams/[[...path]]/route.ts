/**
 * @file 团队 BFF — /api/teams/*（建队、邀请、确认、退出）。
 */
import { forwardToBackend } from '@/shared/bff-forward';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ path?: string[] }> };

export async function GET(req: Request, ctx: Ctx) {
  return forwardToBackend(req, ctx, 'GET', '/teams');
}

export async function POST(req: Request, ctx: Ctx) {
  return forwardToBackend(req, ctx, 'POST', '/teams');
}

export async function PATCH(req: Request, ctx: Ctx) {
  return forwardToBackend(req, ctx, 'PATCH', '/teams');
}

export async function DELETE(req: Request, ctx: Ctx) {
  return forwardToBackend(req, ctx, 'DELETE', '/teams');
}
