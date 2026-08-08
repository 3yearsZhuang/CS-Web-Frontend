/**
 * @file 学习助手对话 API — POST /api/tools/auxilio/chat（SSE 流式透传）
 */
import { proxyStream } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let jsonBody: unknown;
  try {
    jsonBody = await req.json();
  } catch {
    return new Response(JSON.stringify({ message: 'invalid body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return proxyStream(req, { path: '/auxilio/chat', method: 'POST', jsonBody });
}
