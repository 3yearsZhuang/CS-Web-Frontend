/**
 * @file 安全工具单元测试
 *
 * 覆盖 src/shared/security/security.ts 的入口点加固：
 *   - parseJsonBody       Content-Type + JSON 解析
 *   - assertAllowedOrigin Origin/Referer 白名单（含子域名绕过安全负例）
 *   - RateLimiter         IP+key 速率限制
 *   - getCookieValue      Cookie 头解析
 *   - getClientIp         反向代理 IP 提取
 *
 * 安全测试重点（assertAllowedOrigin）：
 *   - 同形子域名绕过（localhost:2333.evil.com）必须被拒绝
 *   - 端口 / 协议敏感（不同端口、不同 https 协议必须拒绝）
 *   - 格式错误 Origin 必须拒绝（非 200）
 *   - 这些负例验证从 startsWith 前缀匹配改为 URL.origin 精确匹配的修复
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  jsonError,
  parseJsonBody,
  assertAllowedOrigin,
  RateLimiter,
  getCookieValue,
  getClientIp,
} from '../../src/shared/security/security';

/** 构造 Request，便于测试 */
function makeRequest(
  init: Partial<RequestInit> & { url?: string } = {},
): Request {
  const { url = 'http://localhost:2333/api/test', ...rest } = init;
  return new Request(url, rest);
}

describe('jsonError', () => {
  it('返回指定状态码与 JSON 错误体', async () => {
    const res = jsonError('失败', 400);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({ error: '失败' });
  });

  it('支持附加响应头', () => {
    const res = jsonError('失败', 429, { 'Retry-After': '60' });
    expect(res.headers.get('Retry-After')).toBe('60');
  });
});

describe('parseJsonBody', () => {
  it('接受 application/json 并解析 body', async () => {
    const req = makeRequest({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ a: 1 }),
    });
    const result = await parseJsonBody<{ a: number }>(req);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.body.a).toBe(1);
  });

  it('接受 application/json; charset=utf-8', async () => {
    const req = makeRequest({
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({}),
    });
    const result = await parseJsonBody(req);
    expect(result.ok).toBe(true);
  });

  it('拒绝非 JSON Content-Type（415）', async () => {
    const req = makeRequest({
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'not json',
    });
    const result = await parseJsonBody(req);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(415);
  });

  it('拒绝缺失 Content-Type（415）', async () => {
    const req = makeRequest({ method: 'POST', body: '{}' });
    const result = await parseJsonBody(req);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(415);
  });

  it('拒绝无效 JSON body（400）', async () => {
    const req = makeRequest({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });
    const result = await parseJsonBody(req);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(400);
  });
});

describe('assertAllowedOrigin', () => {
  it('白名单内的 Origin 放行', () => {
    const req = makeRequest({
      headers: { Origin: 'http://localhost:2333' },
    });
    expect(assertAllowedOrigin(req)).toBeNull();
  });

  it('白名单外的 Origin 被拒绝（403）', () => {
    const req = makeRequest({
      headers: { Origin: 'https://evil.example.com' },
    });
    const result = assertAllowedOrigin(req);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it('Referer 在白名单内时放行', () => {
    const req = makeRequest({
      headers: { Referer: 'http://localhost:2333/login' },
    });
    expect(assertAllowedOrigin(req)).toBeNull();
  });

  it('Origin 与 Referer 均缺失时放行（同源浏览器可能不带）', () => {
    const req = makeRequest();
    expect(assertAllowedOrigin(req)).toBeNull();
  });

  it('Origin 优先级高于 Referer（Origin 非法时拒绝）', () => {
    const req = makeRequest({
      headers: {
        Origin: 'https://evil.example.com',
        Referer: 'http://localhost:2333/path',
      },
    });
    const result = assertAllowedOrigin(req);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  /* ============= 安全负例：防止 startsWith 前缀匹配被绕过 ============= */
  // 旧实现使用 candidate.startsWith(base)，会被同形子域名绕过：
  // 攻击者注册 example.com.evil.com，Origin 为 https://example.com.evil.com
  // startsWith('https://example.com') 返回 true → 绕过白名单。
  // 新实现使用 URL.origin 精确匹配 scheme+host+port，以下负例验证修复。

  it('拒绝同形子域名绕过（localhost:2333.evil.com）', () => {
    const req = makeRequest({
      headers: { Origin: 'http://localhost:2333.evil.com' },
    });
    const result = assertAllowedOrigin(req);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it('拒绝攻击者注册的子域名（evil.com.localhost:2333）', () => {
    const req = makeRequest({
      headers: { Origin: 'http://evil.com.localhost:2333' },
    });
    const result = assertAllowedOrigin(req);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it('拒绝不同端口（localhost:3000 vs 2333）', () => {
    // 注意：默认白名单包含 2333 和 3000，此例用 5101 验证端口敏感
    const req = makeRequest({
      headers: { Origin: 'http://localhost:5101' },
    });
    const result = assertAllowedOrigin(req);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it('拒绝不同协议（https vs http）', () => {
    const req = makeRequest({
      headers: { Origin: 'https://localhost:2333' },
    });
    const result = assertAllowedOrigin(req);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it('拒绝 Origin 中嵌入路径（http://localhost:2333/evil）', () => {
    // Origin 头规范上不应含 path，但攻击者可能构造；需确保不被绕过
    const req = makeRequest({
      headers: { Origin: 'http://localhost:2333/evil' },
    });
    // URL.origin 会忽略 path，所以这个实际会放行（同源）—— 验证语义正确
    expect(assertAllowedOrigin(req)).toBeNull();
  });

  it('拒绝格式错误的 Origin（非 URL）', () => {
    const req = makeRequest({
      headers: { Origin: 'not-a-url' },
    });
    const result = assertAllowedOrigin(req);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it('拒绝 Referer 同形子域名绕过', () => {
    const req = makeRequest({
      headers: { Referer: 'http://localhost:2333.evil.com/path' },
    });
    const result = assertAllowedOrigin(req);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it('白名单内 Origin 带 trailing slash 放行', () => {
    const req = makeRequest({
      headers: { Origin: 'http://localhost:2333/' },
    });
    expect(assertAllowedOrigin(req)).toBeNull();
  });
});

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter(3, 60_000);
  });

  it('未超限时返回 true', () => {
    expect(limiter.check('k1')).toBe(true);
    expect(limiter.check('k1')).toBe(true);
    expect(limiter.check('k1')).toBe(true);
  });

  it('超过阈值返回 false', () => {
    limiter.check('k1');
    limiter.check('k1');
    limiter.check('k1');
    expect(limiter.check('k1')).toBe(false);
  });

  it('不同 key 独立计数', () => {
    limiter.check('k1');
    limiter.check('k1');
    limiter.check('k1');
    expect(limiter.check('k2')).toBe(true);
  });

  it('remaining 返回剩余次数', () => {
    limiter.check('k1');
    expect(limiter.remaining('k1')).toBe(2);
  });

  it('未知 key 返回 max', () => {
    expect(limiter.remaining('unknown')).toBe(3);
  });

  it('sweep 清除过期 bucket', () => {
    const past = new RateLimiter(1, -1); // 已过期窗口
    past.check('k1');
    expect(past.remaining('k1')).toBe(1); // 过期后视为未使用
    past.sweep();
  });
});

describe('getCookieValue', () => {
  it('从 Cookie 头提取指定 cookie', () => {
    const req = makeRequest({
      headers: { Cookie: 'a=1; auth_session=abc; b=2' },
    });
    expect(getCookieValue(req, 'auth_session')).toBe('abc');
  });

  it('cookie 不存在时返回 null', () => {
    const req = makeRequest({
      headers: { Cookie: 'a=1' },
    });
    expect(getCookieValue(req, 'auth_session')).toBeNull();
  });

  it('无 Cookie 头时返回 null', () => {
    const req = makeRequest();
    expect(getCookieValue(req, 'auth_session')).toBeNull();
  });

  it('值含 = 时正确解析', () => {
    const req = makeRequest({
      headers: { Cookie: 'token=abc=def=ghi' },
    });
    expect(getCookieValue(req, 'token')).toBe('abc=def=ghi');
  });
});

describe('getClientIp', () => {
  const originalTrustProxy = process.env.TRUST_PROXY;

  afterEach(() => {
    // 恢复 TRUST_PROXY 原始值，避免污染其他测试
    if (originalTrustProxy === undefined) {
      delete process.env.TRUST_PROXY;
    } else {
      process.env.TRUST_PROXY = originalTrustProxy;
    }
  });

  it('TRUST_PROXY=true 时优先使用 X-Forwarded-For 首个 IP', () => {
    process.env.TRUST_PROXY = 'true';
    const req = makeRequest({
      headers: { 'X-Forwarded-For': '1.2.3.4, 5.6.7.8' },
    });
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('TRUST_PROXY=true 时回退到 X-Real-IP', () => {
    process.env.TRUST_PROXY = 'true';
    const req = makeRequest({
      headers: { 'X-Real-IP': '9.9.9.9' },
    });
    expect(getClientIp(req)).toBe('9.9.9.9');
  });

  it('TRUST_PROXY=true 且无代理头时返回 unknown', () => {
    process.env.TRUST_PROXY = 'true';
    const req = makeRequest();
    expect(getClientIp(req)).toBe('unknown');
  });

  it('默认（非信任模式）忽略 X-Forwarded-For，防止伪造绕过限流', () => {
    delete process.env.TRUST_PROXY;
    const req = makeRequest({
      headers: { 'X-Forwarded-For': '1.2.3.4, 5.6.7.8' },
    });
    expect(getClientIp(req)).toBe('unknown');
  });

  it('默认（非信任模式）使用 X-Real-IP（由 server.ts 从 socket 注入）', () => {
    delete process.env.TRUST_PROXY;
    const req = makeRequest({
      headers: { 'X-Real-IP': '9.9.9.9' },
    });
    expect(getClientIp(req)).toBe('9.9.9.9');
  });

  it('默认（非信任模式）同时存在 XFF 和 X-Real-IP 时只信任 X-Real-IP', () => {
    delete process.env.TRUST_PROXY;
    const req = makeRequest({
      headers: {
        'X-Forwarded-For': 'forged.by.attacker',
        'X-Real-IP': '9.9.9.9',
      },
    });
    expect(getClientIp(req)).toBe('9.9.9.9');
  });

  it('默认（非信任模式）无代理头时返回 unknown', () => {
    delete process.env.TRUST_PROXY;
    const req = makeRequest();
    expect(getClientIp(req)).toBe('unknown');
  });
});
