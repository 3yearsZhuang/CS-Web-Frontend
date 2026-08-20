#!/usr/bin/env node
/**
 * @file tools/scripts/build/restart-frontend.mjs — 前端 dev server 冷重启脚本
 *
 * 用途：B1 收口等大规模删除代码后，tsx watch 的热重载缓存可能损坏，
 * 导致所有 BFF 路由（/api/events、/api/community/*、/api/auth/login 等）
 * 运行时抛 500 空 body，而静态页面（如 /）仍正常 —— 此时无需改代码，
 * 只需冷重启前端 dev server 即可恢复。
 *
 * 行为：释放 2333 端口（SIGKILL 占用进程）→ 重新 `pnpm dev` → 轮询探活直到 200。
 *
 * 用法：
 *   node ./tools/scripts/build/restart-frontend.mjs
 *   PORT=2333 node ./tools/scripts/build/restart-frontend.mjs   # 端口可覆盖
 */

import { spawn, execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '../../..');

const DEFAULT_PORT = 2333;
const port = process.env.DEPLOY_RUN_PORT || process.env.PORT || DEFAULT_PORT;
const baseUrl = `http://localhost:${port}`;
const HEALTH_PATH = '/';
const POLL_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 1_000;

/** 释放目标端口（SIGKILL 占用进程），避免新旧进程端口冲突 */
function freePort(targetPort) {
  try {
    const out = spawnSyncCapture(`lsof -ti :${targetPort}`);
    const pids = out
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (pids.length === 0) {
      console.log(`✓ Port ${targetPort} is free.`);
      return;
    }
    console.log(`⚠ Port ${targetPort} in use by PIDs: ${pids.join(', ')}, killing...`);
    for (const pid of pids) {
      try {
        process.kill(Number(pid), 'SIGKILL');
      } catch {
        // 进程可能已退出
      }
    }
  } catch {
    console.log(`✓ Port ${targetPort} is free.`);
  }
}

/** 用 node 自带 child_process 同步执行命令并捕获 stdout */
function spawnSyncCapture(cmd) {
  try {
    return execFileSync('sh', ['-c', cmd], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    return '';
  }
}

/** 轮询探活，直到前端返回 200 或超时 */
async function waitUntilReady() {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(baseUrl + HEALTH_PATH, { method: 'GET' });
      if (res.ok) {
        console.log(`✓ Frontend dev server is ready at ${baseUrl}`);
        return true;
      }
    } catch {
      // 连接被拒，继续等待
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    process.stdout.write('.');
  }
  console.error(
    `\n✗ Timed out waiting for frontend at ${baseUrl}. Check logs with: make logs-dev-frontend`,
  );
  return false;
}

async function main() {
  console.log('▶ Cold-restarting frontend dev server...');
  freePort(port);

  console.log(`▶ Starting dev server on port ${port}...`);
  const child = spawn('pnpm', ['dev'], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env, PORT: String(port) },
    shell: process.platform === 'win32',
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });

  const ready = await waitUntilReady();
  if (!ready) {
    // 探活失败也保留子进程（用户可看日志），但退出码非 0 提示
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('✗ Restart script failed:', err);
  process.exit(1);
});
