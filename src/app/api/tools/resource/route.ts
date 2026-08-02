/**
 * @file 资源站公开 API — GET/POST /api/tools/resource
 *
 * GET: 列出已发布资源（分页、支持分类/标签/类型过滤、排序）
 * POST: 提交新资源（需登录，进入 draft 审核状态）
 */
import { NextResponse } from 'next/server';
import { listResources, createResource, type CreateResourceInput } from '@/modules/tools/server';
import { getSession } from '@/modules/auth/server';
import { AUTH_COOKIE_NAME } from '@/modules/auth/types/constants';
import {
  parseJsonBody,
  assertAllowedOrigin,
  getClientIp,
  jsonError,
  errorResponse,
  forumPostLimiter,
  getCookieValue,
} from '@/shared/security/security';
import { createResourceSchema, resourceQuerySchema } from '@/shared/security/schemas';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);

  const parsed = resourceQuerySchema.safeParse({
    resourceType: url.searchParams.get('resourceType') ?? undefined,
    techTag: url.searchParams.get('techTag') ?? undefined,
    sort: url.searchParams.get('sort') ?? undefined,
    page: url.searchParams.get('page') || '1',
    pageSize: url.searchParams.get('pageSize') || '20',
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || '参数格式不正确' }, { status: 400 });
  }

  const data = parsed.data;

  try {
    const result = await listResources({
      resourceType: data.resourceType ?? undefined,
      techTag: data.techTag ?? undefined,
      sort: data.sort ?? undefined,
      page: data.page,
      pageSize: data.pageSize,
    });
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  const token = getCookieValue(req, AUTH_COOKIE_NAME);
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  const session = await getSession(token);
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const ip = getClientIp(req);
  if (!forumPostLimiter.check(`resource-create:${ip}`)) {
    return jsonError('操作过于频繁，请稍后再试', 429);
  }

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;

  const result = createResourceSchema.safeParse(parsed.body);
  if (!result.success) {
    return NextResponse.json(
      { error: result.error.issues[0]?.message || '请求格式不正确' },
      { status: 400 },
    );
  }

  const data = result.data;
  const input: CreateResourceInput = {
    title: data.title,
    url: data.url,
    description: data.description ?? undefined,
    resourceType: data.resourceType ?? undefined,
    techTags: data.techTags ?? undefined,
    fileUrl: data.fileUrl ?? undefined,
  };

  try {
    const resource = await createResource(session.session.userId, input);
    return NextResponse.json({ resource }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
