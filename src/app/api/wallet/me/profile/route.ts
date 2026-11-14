/**
 * @file 统一余额档案 BFF — GET /api/wallet/me/profile。
 */
import { forwardToBackend } from '@/shared/bff-forward';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ path?: string[] }> };

export async function GET(req: Request, ctx: Ctx) {
  return forwardToBackend(req, ctx, 'GET', '/wallet/me/profile');
}
