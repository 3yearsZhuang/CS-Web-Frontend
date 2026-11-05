/**
 * @file 公告 API — GET/POST /api/announcements（BFF 薄转发）
 *
 * 迁移样板（routeHandler 工厂）：Cookie 写回与错误规范化由工厂统一执行，
 * 本文件只保留「参数映射 + 出参翻译」两件业务相关的事。
 */
import { assertAllowedOrigin } from '@/shared/security/security';
import {
  BffError,
  routeHandler,
  type OperationName,
  type BackendResponse,
} from '@/shared/bff-route';
import { asArray } from '@/shared/bff-route';
import { NextResponse } from 'next/server';
import { toAnnouncement } from '@/shared/backend-client';
import { t } from '@/i18n';

export const runtime = 'nodejs';

/** 契约锚点：GET /announcements 的 2xx 响应类型（后端契约变更时此处编译期报错） */
type AnnouncementListOp = OperationName<'/api/v1/announcements', 'get'>;
type AnnouncementListBody = BackendResponse<AnnouncementListOp>;

export const GET = routeHandler<AnnouncementListBody | Array<Record<string, unknown>>>(
  { path: '/announcements' },
  ({ proxy }) => asArray(proxy.body).map((item) => toAnnouncement(item)),
);

/** 前端 camelCase → 后端 snake_case 白名单映射（不透传未知键） */
function toCreatePayload(body: Record<string, unknown>) {
  return {
    title: body.title,
    content: body.content ?? '',
    level: body.level ?? 'info',
    is_active: body.isActive ?? true,
    is_dismissible: body.isDismissible ?? true,
    priority: body.priority ?? 0,
    expires_at: body.expiresAt ?? null,
    target_roles: body.targetRoles ?? null,
  };
}

export const POST = routeHandler(
  async ({ req }) => {
    // assertAllowedOrigin 返回 NextResponse（拒绝）或 null（放行）；
    // 拒绝时以 BffError 抛出，由工厂转成该响应本身（保留原状态码与错误体）。
    const originErr = assertAllowedOrigin(req);
    if (originErr) throw await toOriginError(originErr);
    return {
      path: '/admin/announcements',
      method: 'POST',
      jsonBody: toCreatePayload(await req.json().catch(() => ({}))),
    };
  },
  ({ proxy }) => toAnnouncement(proxy.body),
);

/** 把 Origin 守卫的响应转成 BffError（工厂统一出口，避免路由内直接拼响应） */
async function toOriginError(res: NextResponse): Promise<BffError> {
  const body = (await res.json().catch(() => ({}))) as { error?: string; code?: string };
  return new BffError(body.error ?? t('apiError.originNotAllowed'), res.status, body.code);
}
