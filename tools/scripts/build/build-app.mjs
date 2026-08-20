#!/usr/bin/env node
/**
 * @file tools/scripts/build/build-app.mjs — 应用构建脚本
 *
 * 安装依赖、构建 Next.js 生产版本、打包自定义服务器到 dist/server.js。
 *
 * 目录约定：
 *   - Next.js 产物（distDir='.build'）：.build/static、.build/server、.build/routes-manifest.json 等
 *   - tsup 自定义服务器：dist/server.js（与 Dockerfile 一致，避免与 Next 产物混用）
 *
 * 体积说明：Next/Turbopack 会把增量编译缓存写入 .build/cache，随构建次数无限累积
 * （实测可膨胀到 2~4G+）。缓存可再生成，构建完成后立即删除，仅保留运行必需产物。
 */
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// 脚本位于 tools/scripts/<域>/，向上三级才是仓库根（CS-Web-Frontend/）
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '../../..');

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

  // 删除 Turbopack/Next 增量编译缓存（可再生，避免 .build 无限膨胀）
  console.log('▶ Removing build cache (.build/cache, regenerable)...');
  run('rm -rf .build/cache');

  console.log('▶ Bundling custom server with tsup...');
  run(
    'pnpm tsup src/server.ts --format cjs --platform node --target node22 --outDir dist --no-splitting --no-minify',
  );

  console.log('✓ Build completed successfully!');
}

try {
  main();
} catch (err) {
  console.error('✗ Build failed:', err.message);
  process.exit(1);
}
