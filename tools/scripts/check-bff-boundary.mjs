#!/usr/bin/env node
// AL-1 · BFF 安全边界扫描
// ----------------------------------------------------------------------------
// 后端是认证/授权/邮件/OAuth 的唯一权威；BFF（前端）不得在客户端组件中导入
// 密码哈希 / 权限判定 / JWT 签发等权威安全逻辑。本脚本强制这一边界：
//
//   任何带 "use client" 指令的文件，只允许从 `@/shared/security/schemas`
//   （共享校验 schema，纯 Zod，无密码/JWT）导入；禁止导入 shared/security
//   的其余权威模块（password / security / guards / permissions /
//   permission-points / rate-limiter / origin-guard / proxy-headers / ...）
//   以及 barrel `@/shared/security`。
//
// 用法：
//   node tools/scripts/check-bff-boundary.mjs [--src <dir>] [--help]
// 退出码：0 = 通过；1 = 发现越界导入（CI 应失败）。
// ----------------------------------------------------------------------------

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const i = args.indexOf(name);
  if (i >= 0 && i + 1 < args.length) return args[i + 1];
  return fallback;
}
if (args.includes('--help') || args.includes('-h')) {
  console.log('用法: node check-bff-boundary.mjs [--src <dir>]');
  console.log('扫描 <dir> 下所有 .ts/.tsx 中带 "use client" 的文件，');
  console.log('检查其是否从 @/shared/security 的非 schemas 子树导入权威安全模块。');
  process.exit(0);
}

const SRC = resolve(getArg('--src', 'src'));

// 顶层 "use client" 指令（单/双引号均可）
const USE_CLIENT = /(['"])use client\1/;
// 提取静态 import ... from '...'、import '...'、动态 import('...') 的 specifier
const IMPORT_RE =
  /(?:from|import)\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next') continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walk(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

// 归一化 specifier：去掉 "@/"，再判断是否落在 shared/security 下，
// 返回 null（无关）/ 'barrel'（桶文件，禁）/ 'schemas'（仅 schemas 子树，允许）/ 'forbidden'（其余权威模块，禁）
function classify(spec) {
  let s = spec;
  if (s.startsWith('@/')) s = s.slice(2);
  const marker = 'shared/security';
  let rest;
  if (s === marker || s.startsWith(marker + '/')) {
    rest = s.slice(marker.length);
  } else {
    const idx = s.indexOf(marker);
    if (idx < 0) return null; // 非 shared/security 导入，忽略
    rest = s.slice(idx + marker.length);
  }
  if (rest === '' || rest === '/') return 'barrel';
  if (rest.startsWith('/schemas')) return 'schemas';
  return 'forbidden';
}

const violations = [];
for (const file of walk(SRC)) {
  const code = readFileSync(file, 'utf8');
  if (!USE_CLIENT.test(code)) continue;
  let m;
  IMPORT_RE.lastIndex = 0;
  while ((m = IMPORT_RE.exec(code))) {
    const spec = m[1] || m[2];
    const kind = classify(spec);
    if (kind === 'forbidden' || kind === 'barrel') {
      violations.push({ file, spec, kind });
    }
  }
}

if (violations.length > 0) {
  console.error(
    '❌ BFF 安全边界违规：以下 "use client" 文件导入了 shared/security 的权威模块（仅允许 schemas 子树）：'
  );
  for (const v of violations) {
    console.error(`  - ${v.file.replace(SRC + '/', '')}  ←  ${v.spec}  [${v.kind}]`);
  }
  console.error(
    `\n共 ${violations.length} 处违规。后端为认证/授权/邮件/OAuth 唯一权威，BFF 不得在客户端导入密码哈希/权限判定/JWT 签发等逻辑。`
  );
  process.exit(1);
}

console.log(
  '✅ BFF 安全边界检查通过："use client" 文件仅导入 shared/security/schemas（共享校验），无权威模块越界。'
);
process.exit(0);
