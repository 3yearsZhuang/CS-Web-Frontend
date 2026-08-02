/**
 * @file 管理员活动签到管理 API — GET/POST /api/admin/events/[id]/checkin
 *
 * GET: 获取活动签到统计
 * POST: 生成签到码 / 通过签到码核销签到
 */
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/modules/admin/server';
import {
  generateCheckinCodes,
  getEventCheckins,
  getCheckinStats,
  checkinByCode,
} from '@/modules/events/server';
import {
  parseJsonBody,
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  eventCheckinLimiter,
} from '@/shared/security/security';
import { z } from 'zod';

export const runtime = 'nodejs';

const generateSchema = z.object({
  action: z.literal('generate'),
});

const checkinSchema = z.object({
  action: z.literal('checkin'),
  code: z.string().min(1, '签到码不能为空'),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;

  const { id: eventId } = await params;

  try {
    const checkins = await getEventCheckins(eventId);
    const stats = await getCheckinStats(eventId);
    return NextResponse.json({ checkins, stats });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin(req);
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!eventCheckinLimiter.check(`event-checkin:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const { id: eventId } = await params;

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const body = parsed.body as { action?: string; code?: string };

  if (body.action === 'generate') {
    try {
      const result = await generateCheckinCodes(admin.user.id, eventId);
      return NextResponse.json(result);
    } catch (err) {
      return errorResponse(err);
    }
  }

  if (body.action === 'checkin') {
    const result = checkinSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0]?.message || '请求格式不正确' },
        { status: 400 },
      );
    }

    try {
      const checkinResult = await checkinByCode(admin.user.id, eventId, result.data.code);
      if (!checkinResult.ok) {
        return NextResponse.json({ error: checkinResult.error }, { status: 400 });
      }
      return NextResponse.json({
        checkin: checkinResult.checkin,
        displayName: checkinResult.displayName,
      });
    } catch (err) {
      return errorResponse(err);
    }
  }

  return NextResponse.json({ error: '未知操作' }, { status: 400 });
}