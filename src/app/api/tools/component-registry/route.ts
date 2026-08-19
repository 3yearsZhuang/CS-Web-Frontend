/**
 * @file 组件注册表 API — GET/POST /api/tools/component-registry（BFF 薄转发）
 */
import { assertAllowedOrigin } from '@/shared/security/security';
import {
  arrayFrom,
  bodyOrEmpty,
  errJson,
  okJson,
  proxyBackend,
  readJsonBody,
} from '@/shared/backend-client';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const proxy = await proxyBackend(req, { path: '/tools/component-registry' });
  const body = bodyOrEmpty(proxy);
  const items = arrayFrom(body, 'components');
  return okJson({ components: items }, proxy);
}

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = await readJsonBody(req);

  const proxy = await proxyBackend(req, {
    path: '/tools/component-registry',
    method: 'POST',
    jsonBody: {
      name: body.name,
      slug: body.slug,
      category: body.category ?? 'general',
      description: body.description,
      sort_order: body.sortOrder ?? 0,
      migration_status: body.migrationStatus ?? 'legacy',
    },
  });

  if (proxy.status !== 200 && proxy.status !== 201) {
    return errJson(proxy, '创建失败');
  }
  return okJson({ component: proxy.body }, proxy, { status: 201 });
}
