/**
 * @file 图片文件 API — GET /api/community/images/[filename]（BFF 代理）
 */
import { NextResponse } from 'next/server';
import { BACKEND_URL } from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;
  const upstream = await fetch(
    `${BACKEND_URL}/api/v1/community/community/images/${encodeURIComponent(filename)}`,
    { cache: 'no-store' },
  );

  if (upstream.status !== 200) {
    return NextResponse.json({ error: '图片不存在' }, { status: 404 });
  }
  const contentType = upstream.headers.get('content-type') || 'application/octet-stream';
  const bytes = Buffer.from(await upstream.arrayBuffer());
  return new NextResponse(bytes, {
    headers: { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=31536000, immutable' },
  });
}
