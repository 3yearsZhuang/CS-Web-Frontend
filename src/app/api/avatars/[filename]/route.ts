/**
 * @file 头像文件 API — GET /api/avatars/[filename]（BFF 代理 → 后端静态头像）
 */
import { NextResponse } from 'next/server';
import { BACKEND_URL } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  const upstream = await fetch(`${BACKEND_URL}/api/v1/avatars/${encodeURIComponent(filename)}`, {
    cache: 'no-store',
  });

  if (upstream.status !== 200) {
    return NextResponse.json({ error: '头像不存在' }, { status: 404 });
  }
  const contentType = upstream.headers.get('content-type') || 'image/png';
  const bytes = Buffer.from(await upstream.arrayBuffer());
  return new NextResponse(bytes, { headers: { 'Content-Type': contentType } });
}
