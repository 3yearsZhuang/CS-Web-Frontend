/**
 * @file 演示模式生产隔离（A01）单元测试
 *
 * 审计 A01：后端不可达时自动进入演示态，会让「网络故障」表现为「业务成功」——
 * 写接口返回 mock 201、登录返回演示用户并把演示 token 写进认证 Cookie；
 * 且该标记是进程级内存态，一个请求失败会让同实例其他用户一起进入演示。
 *
 * 修复口径：`NODE_ENV === 'production'` 时禁止自动降级与手动 demo，
 * 后端不可达一律如实返回 502；非生产可用 `DEMO_MODE_ENABLED=0` 显式关闭。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

// 后端网络不可达：fetch 直接抛 TypeError（等价于连接失败）
vi.stubGlobal('fetch', vi.fn(async () => {
  throw new TypeError('fetch failed');
}));

/** 每个用例独立重置模块状态（demo-mode 持有进程级 backendUnreachableAt） */
async function loadDemoMode() {
  vi.resetModules();
  return import('@/shared/demo/demo-mode');
}

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  process.env = { ...ORIGINAL_ENV };
  // security/allowed-origins 在生产下缺 ALLOWED_ORIGINS 会 process.exit(1)（其自身安全守卫），
  // 本文件测的是演示模式，故补一个合法值以隔离该守卫。
  process.env.ALLOWED_ORIGINS = 'https://cs.example.com';
});
afterEach(() => {
  vi.unstubAllEnvs();
  process.env = { ...ORIGINAL_ENV };
});

describe('isDemoAllowed', () => {
  it('生产环境一律禁止演示（含手动开关）', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DEMO_MODE_ENABLED', '');
    const demo = await loadDemoMode();
    expect(demo.isDemoAllowed()).toBe(false);
  });

  it('生产环境下 DEMO_MODE_ENABLED=1 也不放行', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DEMO_MODE_ENABLED', '1');
    const demo = await loadDemoMode();
    expect(demo.isDemoAllowed()).toBe(false);
  });

  it('非生产默认允许', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DEMO_MODE_ENABLED', '');
    const demo = await loadDemoMode();
    expect(demo.isDemoAllowed()).toBe(true);
  });

  it('非生产可用 DEMO_MODE_ENABLED=0 关闭', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DEMO_MODE_ENABLED', '0');
    const demo = await loadDemoMode();
    expect(demo.isDemoAllowed()).toBe(false);
  });
});

describe('markBackendUnreachable 在生产为 no-op', () => {
  it('生产标记后 isBackendUnreachable 仍为 false', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const demo = await loadDemoMode();
    demo.markBackendUnreachable();
    expect(demo.isBackendUnreachable()).toBe(false);
  });

  it('非生产标记后生效', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const demo = await loadDemoMode();
    demo.markBackendUnreachable();
    expect(demo.isBackendUnreachable()).toBe(true);
  });
});

describe('isDemoActive 在生产恒为 false', () => {
  it('即使携带 demo cookie 也不进入演示', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const demo = await loadDemoMode();
    const req = new Request('http://localhost/api/x', {
      headers: { cookie: 'fztbu_demo=1' },
    });
    expect(demo.isDemoActive(req)).toBe(false);
    expect(demo.demoSource(req)).toBeNull();
  });

  it('非生产下 demo cookie 生效', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const demo = await loadDemoMode();
    const req = new Request('http://localhost/api/x', {
      headers: { cookie: 'fztbu_demo=1' },
    });
    expect(demo.isDemoActive(req)).toBe(true);
    expect(demo.demoSource(req)).toBe('manual');
  });
});

/** backend-client 需要独立加载（mock 路由表与不可达标记都是模块级状态） */
async function load() {
  vi.resetModules();
  return import('@/shared/backend-client');
}

function makeReq() {
  return new Request('http://localhost/api/join', {
    headers: { cookie: 'fztbu_access=valid; fztbu_refresh=valid' },
  });
}

describe('A01 · 生产环境后端不可达不得假成功', () => {
  it('生产：写接口返回 502，而非 demo mock 的 201', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { proxyBackend } = await load();
    // /join 的 POST 在 demo mock 表里存在（返回 201），修复前会被命中
    const res = await proxyBackend(makeReq(), { path: '/join', method: 'POST', jsonBody: {} });
    expect(res.status).toBe(502);
    expect(res.status).not.toBe(201);
  });

  it('非生产：仍可降级到 demo mock（保留开发体验）', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    const { proxyBackend } = await load();
    const res = await proxyBackend(makeReq(), { path: '/join', method: 'POST', jsonBody: {} });
    expect(res.status).toBe(201);
  });
});
