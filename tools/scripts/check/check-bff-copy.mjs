#!/usr/bin/env node
// i18n · BFF 硬编码中文文案门禁（P1-8 同族收口 / i18n 收口第一步）
// ----------------------------------------------------------------------------
// 背景：BFF（src/app/api/**）中存在大量硬编码中文错误文案（存量 178 处级），
// 游离在 next-intl 体系外。本门禁不要求一次性迁移，而是**冻结增量**：
//
//   - 基线文件 tools/scripts/check/bff-copy-baseline.json 记录每文件当前全部
//     含中文代码行的「去注释后内容」；
//   - 出现基线之外的新的含中文代码行 → exit 1（CI 红，禁止新增硬编码）；
//   - 存量消除（行不再含中文）→ 提示计数，鼓励 `--update` 收缩基线；
//   - 存量迁移按 docs/项目待办v2.md i18n 条目分批进行。
//
// 用法：
//   node tools/scripts/check/check-bff-copy.mjs                     # 检查（CI 用）
//   node tools/scripts/check/check-bff-copy.mjs --update            # 重生成基线（评审后）
//   node tools/scripts/check/check-bff-copy.mjs --api <dir>         # 自定义扫描目录
// 退出码：0 = 无新增；1 = 发现基线外硬编码（CI 应失败）。
// ----------------------------------------------------------------------------

import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const i = args.indexOf(name);
  if (i >= 0 && i + 1 < args.length) return args[i + 1];
  return fallback;
}
if (args.includes('--help') || args.includes('-h')) {
  console.log('用法: node check-bff-copy.mjs [--api <dir>] [--update]');
  console.log('扫描 BFF 路由中的硬编码中文代码行，与基线逐行比对；新增即失败。');
  console.log('  --update  按当前状态重写基线（先修后更，评审后使用）');
  process.exit(0);
}

const API_DIR = resolve(getArg('--api', 'src/app/api'));
const BASELINE_PATH = resolve('tools/scripts/check/bff-copy-baseline.json');
const CJK = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const UPDATE = args.includes('--update');

/** 列出目录下全部 .ts/.tsx（递归） */
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}
/** 去掉行内注释后判断是否含 CJK。 */
function codePart(line) {
  let s = line.trim();
  if (s.startsWith('*') || s.startsWith('/*')) return ''; // JSDoc/块注释行（含续行）
  s = s.replace(/\/\*.*?(\*\/|$)/g, ''); // 行内块注释（含未闭合到行尾）
  s = s.replace(/\/\/.*$/, ''); // 行注释（字符串内 // 极少见，可接受）
  return s;
}

function scanFile(path) {
  const offenders = [];
  readFileSync(path, 'utf8')
    .split('\n')
    .forEach((raw) => {
      const code = codePart(raw);
      if (CJK.test(code)) offenders.push(code.trim());
    });
  return offenders;
}

function main() {
  if (!existsSync(API_DIR)) {
    console.error(`[check-bff-copy] 扫描目录不存在: ${API_DIR}`);
    process.exit(1);
  }
  const files = walk(API_DIR).sort();

  /** @type {Record<string, string[]>} */
  const baseline = existsSync(BASELINE_PATH)
    ? JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
    : {};

  /** @type {Record<string, string[]>} */
  const current = {};
  let totalOffenders = 0;
  for (const f of files) {
    const rel = relative(process.cwd(), f).split('\\').join('/');
    current[rel] = scanFile(f);
    totalOffenders += current[rel].length;
  }

  if (UPDATE) {
    writeFileSync(BASELINE_PATH, JSON.stringify(current, null, 2) + '\n');
    console.log(
      `[check-bff-copy] 基线已更新：${Object.keys(current).length} 文件 / ${totalOffenders} 行存量（评审后提交）`,
    );
    process.exit(0);
  }

  const newOffenses = [];
  const cleaned = [];
  for (const [rel, lines] of Object.entries(current)) {
    const known = new Set(baseline[rel] ?? []);
    if (!baseline[rel]) {
      if (lines.length > 0) newOffenses.push(`新文件含硬编码中文: ${rel}（${lines.length} 行）`);
      continue;
    }
    for (const line of lines) {
      if (!known.has(line)) newOffenses.push(`${rel}: ${line.slice(0, 80)}`);
    }
    const eliminated = (baseline[rel] ?? []).filter((l) => !lines.includes(l)).length;
    if (eliminated > 0) cleaned.push(`${rel}: -${eliminated}`);
  }

  console.log(
    `[check-bff-copy] 扫描 ${files.length} 个 BFF 文件，存量含中文代码行 ${totalOffenders} 行（基线冻结，禁止新增）`,
  );
  if (cleaned.length > 0) {
    console.log('[check-bff-copy] 存量消除（可 --update 收缩基线）:');
    for (const c of cleaned) console.log(`  ${c}`);
  }
  if (newOffenses.length > 0) {
    console.error(`[check-bff-copy] ❌ 发现 ${newOffenses.length} 行基线外硬编码中文：`);
    for (const n of newOffenses.slice(0, 20)) console.error(`  ${n}`);
    if (newOffenses.length > 20) console.error(`  ... 其余 ${newOffenses.length - 20} 行`);
    console.error('  请改走 next-intl 词条（src/i18n/messages/*）；确属无法迁移时评审后 --update。');
    process.exit(1);
  }
  console.log('[check-bff-copy] ✅ 无新增硬编码。');
}

main();
