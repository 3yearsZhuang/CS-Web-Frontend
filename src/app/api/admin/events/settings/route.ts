/**
 * @file 活动设置 API — GET/PUT /api/admin/events/settings
 *
 * GET: 获取活动模块全部设置（含默认值）
 * PUT: 批量更新设置项
 * DELETE: 重置单项设置
 *
 * 安全控制：
 *   - 必须管理员登录（requireAdmin 守卫）
 *   - Origin 白名单
 *   - 速率限制
 */

import { NextResponse } from 'next/server';
import { requireAdmin } from '@/modules/admin/server';
import {
  parseJsonBody,
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  adminActionsLimiter,
} from '@/shared/security/security';
import {
  getEventSettings,
  updateEventSetting,
  resetEventSetting,
  type EventSettings,
} from '@/modules/events/server';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`events-settings:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const settings = getEventSettings();
  return NextResponse.json({ settings });
}

export async function PUT(req: Request) {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`events-settings:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const body = parsed.body as Record<string, unknown>;

  const validKeys: (keyof EventSettings)[] = [
    'title_max',
    'desc_max',
    'month_max',
    'date_max',
    'year_max',
    'tag_max',
    'tags_max',
    'content_max',
    'default_capacity',
    'max_capacity',
    'default_page_size',
    'max_page_size',
  ];

  try {
    let settings = getEventSettings();

    for (const key of validKeys) {
      if (key in body) {
        const value = body[key];
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
          settings = updateEventSetting(key, value as number);
        }
      }
    }

    return NextResponse.json({ settings });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: Request) {
  const admin = requireAdmin(req);
  if (!admin.ok) return admin.response;

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!adminActionsLimiter.check(`events-settings:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const url = new URL(req.url);
  const key = url.searchParams.get('key') as keyof EventSettings | null;

  if (!key) {
    return NextResponse.json({ error: '缺少 key 参数' }, { status: 400 });
  }

  const validKeys: (keyof EventSettings)[] = [
    'title_max',
    'desc_max',
    'month_max',
    'date_max',
    'year_max',
    'tag_max',
    'tags_max',
    'content_max',
    'default_capacity',
    'max_capacity',
    'default_page_size',
    'max_page_size',
  ];

  if (!validKeys.includes(key)) {
    return NextResponse.json({ error: '无效的 key' }, { status: 400 });
  }

  try {
    const settings = resetEventSetting(key);
    return NextResponse.json({ settings });
  } catch (err) {
    return errorResponse(err);
  }
}