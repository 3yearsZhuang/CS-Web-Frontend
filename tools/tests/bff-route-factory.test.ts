/**
 * @file BFF 路由工厂（routeHandler）单元测试
 *
 * 重点验证 A06：401→刷新成功→业务错误时，错误响应**必须**写回轮换后的 authPair，
 * 否则浏览器继续持有已轮换的 refresh，超宽限后触发会话家族撤销。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const ORIGINAL_ENV = { ...process.env };
beforeEach(() => {
  process.env = { ...ORIGINAL_ENV, ALLOWED_ORIGINS: 'https://cs.example.com' };
  vi.resetModules();
});

/** 构造可注入的 proxyBackend 桩：按 case 返回不同 ProxyResult */
async function loadFactory() {
  vi.resetModules();
  const backendClient = await import('@/shared/backend-client');
  return { backendClient };
}

function makeReq() {
  return new Request('http://localhost/api/x', {
    headers: { cookie: 'fztbu_access=expired-access; fztbu_refresh=valid-refresh' },
  });
}

/** 把 Set-Cookie 头解析成 map，便于断言 */
function cookiesOf(res: Response): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of res.headers.getSetCookie?.() ?? []) {
    const [pair] = c.split(';');
    const idx = pair.indexOf('=');
    if (idx > 0) out[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
  }
  return out;
}

describe('routeHandler 基本行为', () => {
  it('成功时返回数据并写回 authPair', async () => {
    const { routeHandler } = await loadFactory().then(async () => import('@/shared/bff-route'));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ items: [1, 2] }), { status: 200 })),
    );
    const h = routeHandler({ path: '/list' }, ({ proxy }) => proxy.body);
    const res = await h(makeReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ items: [1, 2] });
  });

  it('后端 500 不进入业务翻译（不渲染成 200 空列表）', async () => {
    const { routeHandler } = await loadFactory().then(async () => import('@/shared/bff-route'));
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ message: 'boom' }), { status: 500 })),
    );
    const h = routeHandler({ path: '/list' }, () => []);
    const res = await h(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  it('BffError 映射为对应状态码与错误体', async () => {
    const { routeHandler, BffError } = await import('@/shared/bff-route');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));
    const h = routeHandler({ path: '/list' }, () => {
      throw new BffError('参数不合法', 400, 'INVALID_PARAM');
    });
    const res = await h(makeReq());
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: '参数不合法', code: 'INVALID_PARAM' });
  });

  it('asArray 兼容裸数组与 {items} 两种形状', async () => {
    const { asArray } = await import('@/shared/bff-route');
    expect(asArray([{ a: 1 }])).toEqual([{ a: 1 }]);
    expect(asArray({ items: [{ a: 1 }] })).toEqual([{ a: 1 }]);
    expect(asArray({})).toEqual([]);
    expect(asArray(null)).toEqual([]);
  });
});

describe('A06 · 错误分支必须写回轮换后的 authPair', () => {
  it('刷新成功 + 业务 422：响应仍带新 token（不得丢会话）', async () => {
    vi.resetModules();
    // 模拟完整链路：首次 401 → 刷新成功 → 重试返回 422
    const fetchMock = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/auth/refresh')) {
        return new Response(
          JSON.stringify({ accessToken: 'new-access', refreshToken: 'new-refresh' }),
          { status: 200 },
        );
      }
      const auth = (init?.headers as Record<string, string> | undefined)?.Authorization ?? '';
      if (auth === 'Bearer expired-access') {
        return new Response(JSON.stringify({ message: 'expired' }), { status: 401 });
      }
      // 重试成功拿到新 token，但业务层返回 422
      return new Response(JSON.stringify({ message: 'unprocessable' }), { status: 422 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const { routeHandler } = await import('@/shared/bff-route');
    const h = routeHandler({ path: '/write', method: 'POST', jsonBody: {} }, () => ({ ok: true }));
    const res = await h(makeReq());

    expect(res.status).toBe(422);
    const cookies = cookiesOf(res);
    // 关键断言：错误响应必须携带轮换后的新 refresh（A06 修复点）
    expect(cookies['fztbu_refresh']).toBe('new-refresh');
    expect(cookies['fztbu_access']).toBe('new-access');
  });
});
