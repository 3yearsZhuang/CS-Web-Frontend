/**
 * @file 自定义 Next.js HTTP 服务器入口
 *
 * 由 dev-server.mjs / start-server.mjs 调用。默认端口 2333。
 * 手动加载 .env（自定义 server 不自动加载）。
 * TRUST_PROXY 控制反向代理头信任策略；为每个请求注入 x-request-id。
 */

import { createServer } from 'http';
import { randomUUID } from 'node:crypto';
import { parse } from 'url';
import fs from 'node:fs';
import path from 'node:path';
import next from 'next';
import { sanitizeProxyHeaders } from '@/shared/security/proxy-headers';
import { logger } from '@/shared/logger';

// 手动加载 .env（自定义 server 不支持自动加载），不覆盖已有 shell 环境变量
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 0) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
// 默认 2333，避开 macOS AirPlay 占用的 5000
const port = parseInt(process.env.PORT || '2333', 10);
// false 时从 socket 注入真实 IP，防止伪造代理头绕过限流
const trustProxy = process.env.TRUST_PROXY === 'true';

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    // 注入 requestId，优先复用客户端传入的（跨服务追踪）
    const incomingRequestId = req.headers['x-request-id'] as string | undefined;
    const requestId = incomingRequestId || randomUUID();
    req.headers['x-request-id'] = requestId;

    try {
      if (!trustProxy) {
        sanitizeProxyHeaders(req);
      }
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      logger.error({ err, requestId, url: req.url }, '请求处理失败');
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });
  server.once('error', err => {
    logger.fatal({ err }, '监听失败');
    process.exit(1);
  });
  server.listen(port, () => {
    logger.info(
      { hostname, port, env: dev ? 'development' : process.env.NODE_ENV, trustProxy },
      `Server 监听: http://${hostname}:${port}`,
    );
  });
}).catch(err => {
  logger.fatal({ err }, 'Next.js prepare 失败，服务器无法启动');
  process.exit(1);
});
