#!/usr/bin/env node
/**
 * @file tools/scripts/build-app.mjs — 应用构建脚本
 *
 * 安装依赖、构建 Next.js 生产版本、打包自定义服务器到 .build/server.js。
 */
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '..');

function run(cmd) {
  console.log(`▶ ${cmd}`);
  execSync(cmd, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

function main() {
  console.log('▶ Installing dependencies...');
  run('pnpm install --prefer-frozen-lockfile --prefer-offline');

  console.log('▶ Building Next.js project...');
  run('pnpm next build');

  console.log('▶ Bundling custom server with tsup...');
  run(
    'pnpm tsup src/server.ts --format cjs --platform node --target node20 --outDir .build --no-splitting --no-minify',
  );

  console.log('✓ Build completed successfully!');
}

try {
  main();
} catch (err) {
  console.error('✗ Build failed:', err.message);
  process.exit(1);
}
