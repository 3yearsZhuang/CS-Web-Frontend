/**
 * @file 活动详情 API — GET /api/events/[id]
 *
 * 公开读取：任何访客可查看活动详情，包含已报名人数。
 * 活动不存在时返回 404。
 */
import { NextResponse } from 'next/server';
import { getEvent } from '@/modules/events/server';
import { errorResponse } from '@/shared/security/security';

export const runtime = 'nodejs';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const event = await getEvent(id);

    if (!event) {
      return NextResponse.json({ error: '活动不存在' }, { status: 404 });
    }

    return NextResponse.json({
      event,
      registeredCount: event.registeredCount ?? 0,
    });
  } catch (err) {
    return errorResponse(err);
  }
}