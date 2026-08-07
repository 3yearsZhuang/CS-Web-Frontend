#!/usr/bin/env node
/**
 * @file tools/scripts/start-server.mjs — 启动打包后的生产服务器
 *
 * 检查 dist/server.js 是否存在并通过 node 启动；默认端口 2333。
 */
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// 脚本位于 tools/scripts/，向上两级才是仓库根（CS-Web-Frontend/）
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '../..');

/** 默认端口 2333，避开 macOS AirPlay 占用的 5000 */
const DEFAULT_PORT = 2333;
const port = process.env.DEPLOY_RUN_PORT || process.env.PORT || DEFAULT_PORT;

async function main() {
  const serverFile = resolve(projectRoot, 'dist/server.js');
  if (!existsSync(serverFile)) {
    console.error(`✗ Build output not found: ${serverFile}`);
    console.error('  Run `pnpm build` first.');
    process.exit(1);
  }

  console.log(`▶ Starting production server on port ${port}...`);
  const { spawn } = await import('node:child_process');
  const child = spawn('node', [serverFile], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env, PORT: String(port) },
  });

  child.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((err) => {
  console.error('✗ Start script failed:', err);
  process.exit(1);
});
