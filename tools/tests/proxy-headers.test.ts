/**
 * @file 反向代理头清理单元测试
 *
 * 覆盖 src/shared/security/proxy-headers.ts 的 sanitizeProxyHeaders：
 *   - 删除伪造的 X-Forwarded-For / X-Real-IP（大小写不敏感）
 *   - rawHeaders 与 headers 双向清除
 *   - 注入真实 socket IP 到 X-Real-IP
 *   - IPv4-mapped IPv6 前缀（::ffff:）规范化
 *   - socket 缺失时回退 'unknown'
 *
 * 对应 roadmap R9：server.ts 代理头清理无测试覆盖。
 */
import { describe, it, expect } from 'vitest';
import { sanitizeProxyHeaders } from '../../src/shared/security/proxy-headers';
import type { IncomingMessage } from 'http';

/** 构造最小可测的 IncomingMessage mock */
function makeReq(opts: {
  rawHeaders?: string[];
  headers?: Record<string, string>;
  remoteAddress?: string;
}): IncomingMessage {
  const socket = opts.remoteAddress !== undefined
    ? { remoteAddress: opts.remoteAddress }
    : { remoteAddress: '203.0.113.1' };
  return {
    rawHeaders: opts.rawHeaders ? [...opts.rawHeaders] : [],
    headers: opts.headers ? { ...opts.headers } : {},
    socket,
  } as unknown as IncomingMessage;
}

describe('sanitizeProxyHeaders', () => {
  describe('清除伪造的代理头', () => {
    it('从 rawHeaders 删除 X-Forwarded-For', () => {
      const req = makeReq({
        rawHeaders: ['X-Forwarded-For', '1.2.3.4', 'Host', 'example.com'],
      });
      sanitizeProxyHeaders(req);
      expect(req.rawHeaders).toEqual(['Host', 'example.com']);
    });

    it('从 rawHeaders 删除 X-Real-IP', () => {
      const req = makeReq({
        rawHeaders: ['X-Real-IP', '5.6.7.8', 'Host', 'example.com'],
      });
      sanitizeProxyHeaders(req);
      expect(req.rawHeaders).toEqual(['Host', 'example.com']);
    });

    it('大小写不敏感（x-forwarded-for 小写）', () => {
      const req = makeReq({
        rawHeaders: ['x-forwarded-for', '1.2.3.4', 'Host', 'example.com'],
      });
      sanitizeProxyHeaders(req);
      expect(req.rawHeaders).toEqual(['Host', 'example.com']);
    });

    it('混合大小写（X-Forwarded-FOR）', () => {
      const req = makeReq({
        rawHeaders: ['X-Forwarded-FOR', '1.2.3.4', 'Host', 'example.com'],
      });
      sanitizeProxyHeaders(req);
      expect(req.rawHeaders).toEqual(['Host', 'example.com']);
    });

    it('从 headers 对象删除代理头', () => {
      const req = makeReq({
        headers: {
          'x-forwarded-for': '1.2.3.4',
          'x-real-ip': '5.6.7.8',
          host: 'example.com',
        },
      });
      sanitizeProxyHeaders(req);
      expect(req.headers['x-forwarded-for']).toBeUndefined();
      expect(req.headers['x-real-ip']).not.toBe('5.6.7.8');
      expect(req.headers['host']).toBe('example.com');
    });

    it('同时清除 rawHeaders 和 headers 中的多个代理头', () => {
      const req = makeReq({
        rawHeaders: [
          'X-Forwarded-For', '1.2.3.4',
          'X-Real-IP', '5.6.7.8',
          'X-Forwarded-For', '9.10.11.12',
          'Host', 'example.com',
        ],
        headers: {
          'x-forwarded-for': '1.2.3.4',
          'x-real-ip': '5.6.7.8',
          host: 'example.com',
        },
      });
      sanitizeProxyHeaders(req);
      expect(req.rawHeaders).toEqual(['Host', 'example.com']);
      expect(req.headers['x-forwarded-for']).toBeUndefined();
      expect(req.headers['host']).toBe('example.com');
    });

    it('无代理头时不影响其他头', () => {
      const req = makeReq({
        rawHeaders: ['Host', 'example.com', 'Accept', 'text/html'],
        headers: { host: 'example.com', accept: 'text/html' },
      });
      sanitizeProxyHeaders(req);
      expect(req.rawHeaders).toEqual(['Host', 'example.com', 'Accept', 'text/html']);
      expect(req.headers['host']).toBe('example.com');
      expect(req.headers['accept']).toBe('text/html');
    });
  });

  describe('注入真实 socket IP', () => {
    it('将 socket 远端地址注入 X-Real-IP', () => {
      const req = makeReq({ remoteAddress: '203.0.113.42' });
      sanitizeProxyHeaders(req);
      expect(req.headers['x-real-ip']).toBe('203.0.113.42');
    });

    it('规范化 IPv4-mapped IPv6 前缀（::ffff:）', () => {
      const req = makeReq({ remoteAddress: '::ffff:203.0.113.42' });
      sanitizeProxyHeaders(req);
      expect(req.headers['x-real-ip']).toBe('203.0.113.42');
    });

    it('保留纯 IPv6 地址（无 ::ffff: 前缀）', () => {
      const req = makeReq({ remoteAddress: '2001:db8::1' });
      sanitizeProxyHeaders(req);
      expect(req.headers['x-real-ip']).toBe('2001:db8::1');
    });

    it('socket 远端地址缺失时回退 unknown', () => {
      const req = makeReq({ remoteAddress: '' });
      sanitizeProxyHeaders(req);
      expect(req.headers['x-real-ip']).toBe('unknown');
    });

    it('socket undefined 时回退 unknown', () => {
      const req = {
        rawHeaders: [] as string[],
        headers: {} as Record<string, string>,
        socket: undefined,
      } as unknown as IncomingMessage;
      sanitizeProxyHeaders(req);
      expect(req.headers['x-real-ip']).toBe('unknown');
    });
  });

  describe('综合场景', () => {
    it('清除伪造头并注入真实 IP（模拟攻击场景）', () => {
      const req = makeReq({
        rawHeaders: ['X-Forwarded-For', 'spoofed-ip', 'Host', 'example.com'],
        headers: { 'x-forwarded-for': 'spoofed-ip', host: 'example.com' },
        remoteAddress: '::ffff:198.51.100.1',
      });
      sanitizeProxyHeaders(req);
      expect(req.rawHeaders).toEqual(['Host', 'example.com']);
      expect(req.headers['x-forwarded-for']).toBeUndefined();
      expect(req.headers['x-real-ip']).toBe('198.51.100.1');
    });
  });
});
