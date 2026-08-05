#!/usr/bin/env node
/**
 * @file tools/scripts/dev-server.mjs — 开发服务器启动脚本
 *
 * 释放目标端口后通过 pnpm tsx watch 启动 src/server.ts，文件变更自动重启；默认端口 2333。
 */
import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '..');

/** 默认端口 2333，避开 macOS AirPlay 占用的 5000 */
const DEFAULT_PORT = 2333;
const port = process.env.DEPLOY_RUN_PORT || process.env.PORT || DEFAULT_PORT;

function killPortIfListening(targetPort) {
  const platform = process.platform;
  let pids = [];

  try {
    if (platform === 'win32') {
      const out = execSync(`netstat -ano | findstr :${targetPort}`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      pids = [
        ...new Set(
          out
            .split('\n')
            .map((line) => line.trim().split(/\s+/).pop())
            .filter(Boolean),
        ),
      ];
    } else {
      const out = execSync(`lsof -ti :${targetPort}`, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      pids = out
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
    }
  } catch {
    // lsof / netstat 返回非零表示无进程占用
  }

  if (pids.length === 0) {
    console.log(`✓ Port ${targetPort} is free.`);
    return;
  }

  console.log(`⚠ Port ${targetPort} in use by PIDs: ${pids.join(', ')}, killing...`);
  for (const pid of pids) {
    try {
      if (platform === 'win32') {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
      } else {
        process.kill(Number(pid), 'SIGKILL');
      }
    } catch {
      // 进程可能已退出
    }
  }

  // 等待端口释放
  return new Promise((r) => setTimeout(r, 1000));
}

async function main() {
  console.log(`▶ Clearing port ${port} before start...`);
  await killPortIfListening(port);

  // 上传文件根目录（前端不再有 SQLite，data/ 仅用于运行时本地文件）
  const dataDir = resolve(projectRoot, 'data');
  if (!existsSync(dataDir)) {
    console.log(`▶ Creating data directory: ${dataDir}`);
    try {
      const { mkdirSync } = await import('node:fs');
      mkdirSync(dataDir, { recursive: true });
    } catch (e) {
      console.warn(`⚠ Failed to create data/ directory:`, e.message);
    }
  }

  console.log(`▶ Starting dev server on port ${port}...`);
  const { spawn } = await import('node:child_process');
  const child = spawn('pnpm', ['tsx', 'watch', 'src/server.ts'], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env, PORT: String(port) },
    shell: process.platform === 'win32',
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error('✗ Dev script failed:', err);
  process.exit(1);
});
