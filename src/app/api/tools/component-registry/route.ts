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
  // TOOLS-GOV Slice D：后端真实路径 /tools/components（原 404），返回裸数组
  const proxy = await proxyBackend(req, { path: '/tools/components' });
  const raw = proxy.body as unknown;
  const items = Array.isArray(raw)
    ? (raw as Array<Record<string, unknown>>)
    : arrayFrom(bodyOrEmpty(proxy), 'components');
  return okJson({ components: items }, proxy);
}

export async function POST(req: Request) {
  const originErr = assertAllowedOrigin(req);
  if (originErr) return originErr;

  const body = await readJsonBody(req);

  const proxy = await proxyBackend(req, {
    path: '/tools/components',
    method: 'POST',
    jsonBody: {
      name: body.name,
      slug: body.slug,
      category: body.category ?? 'general',
      description: body.description,
      sortOrder: body.sortOrder ?? 0,
      migrationStatus: body.migrationStatus ?? 'legacy',
    },
  });

  if (proxy.status !== 200 && proxy.status !== 201) {
    return errJson(proxy, '创建失败');
  }
  // 消费方 store 读取 { item: ComponentItem }
  return okJson({ item: proxy.body }, proxy, { status: 201 });
}
