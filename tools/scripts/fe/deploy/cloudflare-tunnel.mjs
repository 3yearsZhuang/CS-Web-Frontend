#!/usr/bin/env node
/**
 * @file tools/scripts/cloudflare-tunnel.mjs — Cloudflare Tunnel 内网穿透启动脚本
 *
 * 启动 cloudflared 将本地端口暴露为 trycloudflare.com 公网地址，并可选更新 .env 中的相关配置。
 */
import { execSync, spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(__dirname, '..');

const DEFAULT_PORT = 2333;

const args = process.argv.slice(2);
let port = DEFAULT_PORT;
let updateEnv = true;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' && args[i + 1]) {
    port = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === '--no-update-env') {
    updateEnv = false;
  }
}

function ensureCloudflared() {
  try {
    execSync('cloudflared --version', { stdio: 'ignore' });
    return true;
  } catch {
    // 未安装
  }

  console.log('⚠ cloudflared 未安装，正在通过 Homebrew 安装...');
  try {
    execSync('brew install cloudflared', { stdio: 'inherit' });
    console.log('✓ cloudflared 安装完成');
    return true;
  } catch {
    console.error('✗ 自动安装失败，请手动安装：brew install cloudflared');
    console.error('  或从 https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/ 下载');
    process.exit(1);
  }
}

function killExistingTunnels() {
  const platform = process.platform;

  try {
    if (platform === 'win32') {
      const out = execSync('tasklist /FI "IMAGENAME eq cloudflared*"', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const lines = out.split('\n').filter((l) => l.toLowerCase().includes('cloudflared'));
      lines.forEach((line) => {
        const pid = line.trim().split(/\s+/)[1];
        if (pid) {
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
          } catch { /* 进程可能已退出 */ }
        }
      });
    } else {
      const out = execSync('pgrep -f "cloudflared tunnel"', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      });
      const pids = out.split('\n').map((s) => s.trim()).filter(Boolean);
      for (const pid of pids) {
        try {
          process.kill(Number(pid), 'SIGTERM');
        } catch { /* 进程可能已退出 */ }
      }
    }
  } catch {
    // 无进程在运行
  }

  // 等待进程退出
  return new Promise((r) => setTimeout(r, 500));
}

function checkServerRunning(targetPort) {
  try {
    const platform = process.platform;
    if (platform === 'win32') {
      execSync(`netstat -ano | findstr :${targetPort}`, { stdio: 'ignore' });
    } else {
      execSync(`lsof -i :${targetPort}`, { stdio: 'ignore' });
    }
    return true;
  } catch {
    return false;
  }
}

function updateEnvFile(tunnelUrl) {
  const envPath = resolve(projectRoot, '.env');

  if (!existsSync(envPath)) {
    console.warn('⚠ .env 文件不存在，跳过更新');
    return;
  }

  let content = readFileSync(envPath, 'utf8');

  const siteUrlRegex = /^NEXT_PUBLIC_SITE_URL=.*$/m;
  if (siteUrlRegex.test(content)) {
    content = content.replace(siteUrlRegex, `NEXT_PUBLIC_SITE_URL=${tunnelUrl}`);
  }

  // 移除旧的 trycloudflare.com 地址后追加新的 tunnel 地址
  const originsRegex = /^ALLOWED_ORIGINS=(.*)$/m;
  const match = content.match(originsRegex);
  if (match) {
    let origins = match[1];
    origins = origins
      .split(',')
      .filter((o) => !o.includes('trycloudflare.com'))
      .map((o) => o.trim())
      .join(',');
    origins += `,${tunnelUrl}`;
    content = content.replace(originsRegex, `ALLOWED_ORIGINS=${origins}`);
  }

  writeFileSync(envPath, content, 'utf8');
  console.log(`✓ 已更新 .env：`);
  console.log(`  NEXT_PUBLIC_SITE_URL=${tunnelUrl}`);
  console.log(`  ALLOWED_ORIGINS 已追加 ${tunnelUrl}`);
}

function startTunnel(targetPort) {
  return new Promise((resolve, reject) => {
    const child = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${targetPort}`], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    let tunnelUrl = null;
    let allOutput = '';

    const tryExtractUrl = (line) => {
      const match = line.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
      if (match && !tunnelUrl) {
        tunnelUrl = match[0];
        resolve({ tunnelUrl, child });
      }
    };

    // 新版 cloudflared 将 URL 输出到 stderr
    const rl = createInterface({ input: child.stderr });

    rl.on('line', (line) => {
      console.log(`[cloudflared] ${line}`);
      tryExtractUrl(line);
    });

    child.stdout.on('data', (data) => {
      const text = data.toString();
      allOutput += text;
      // 也尝试从 stdout 提取（兼容旧版）
      text.split('\n').forEach(tryExtractUrl);
    });

    const timeout = setTimeout(() => {
      if (!tunnelUrl) {
        child.kill();
        reject(new Error(`Tunnel 启动超时\n日志: ${allOutput.slice(-500)}`));
      }
    }, 30000);

    child.on('exit', (code) => {
      clearTimeout(timeout);
      if (!tunnelUrl) {
        reject(new Error(`cloudflared 异常退出 (code: ${code})\n日志: ${allOutput.slice(-500)}`));
      }
    });

    // 一旦获取到 URL，清除超时
    const origResolve = resolve;
    resolve = (val) => {
      clearTimeout(timeout);
      origResolve(val);
    };
  });
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  Cloudflare Tunnel — 一键内网穿透');
  console.log('═══════════════════════════════════════');
  console.log();

  console.log('▶ 检测 cloudflared...');
  ensureCloudflared();

  console.log('▶ 清理已有 tunnel 进程...');
  await killExistingTunnels();
  console.log('✓ 已清理');

  console.log(`▶ 检查本地服务器 (port ${port})...`);
  if (!checkServerRunning(port)) {
    console.warn(`⚠ 端口 ${port} 上没有检测到服务器，请先启动项目（pnpm dev）`);
    console.warn('  继续启动 tunnel，但可能无法正常访问...');
  } else {
    console.log(`✓ 服务器正在端口 ${port} 运行`);
  }

  console.log('▶ 启动 Cloudflare Tunnel...');
  console.log();

  let tunnelUrl;
  try {
    const result = await startTunnel(port);
    tunnelUrl = result.tunnelUrl;
  } catch (err) {
    console.error(`✗ Tunnel 启动失败: ${err.message}`);
    process.exit(1);
  }

  console.log();
  console.log('═══════════════════════════════════════');
  console.log('  Tunnel 启动成功！');
  console.log('═══════════════════════════════════════');
  console.log();
  console.log(`  公网地址: ${tunnelUrl}`);
  console.log(`  本地服务: http://localhost:${port}`);
  console.log();

  if (updateEnv) {
    updateEnvFile(tunnelUrl);

    // NEXT_PUBLIC_ 变量需重启 dev 服务器才能生效
    if (checkServerRunning(port)) {
      console.log();
      console.warn('⚠ NEXT_PUBLIC_ 变量已更新，需要重启 dev 服务器才能生效：');
      console.warn('  1. Ctrl+C 停止当前 dev 服务器');
      console.warn('  2. 重新运行 pnpm dev');
      console.warn('  3. 重新运行 pnpm tunnel（因为 tunnel 也会随服务器停止而断开）');
    }
  }

  // 保持进程运行（tunnel 子进程在后台）
  console.log();
  console.log('Tunnel 正在运行中… 按 Ctrl+C 停止');
}

main().catch((err) => {
  console.error('✗ Tunnel 脚本失败:', err);
  process.exit(1);
});
