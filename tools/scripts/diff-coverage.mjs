#!/usr/bin/env node
/**
 * PR 级 diff 覆盖率门禁（ER-13 / 3c）。
 *
 * 读取 `coverage/lcov.info`（pnpm test:coverage 产物）+ `git diff` 新增行，
 * 计算新增代码（src/**）的行覆盖率，低于阈值则 exit 1。
 *
 * 用法：
 *   node tools/scripts/diff-coverage.mjs --base origin/main --threshold 80 \
 *     --lcov coverage/lcov.info --src src
 *
 * 退出码：0 通过（或无新增行）；1 覆盖率不足 / 运行错误。
 */
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';

function parseArgs(argv) {
  const args = {
    base: 'origin/main',
    threshold: 80,
    lcov: 'coverage/lcov.info',
    src: 'src',
    // 默认排除纯翻译数据（与 vitest coverage exclude 对齐，避免 PR 加翻译触发门禁失败）
    exclude: ['src/i18n/messages/**'],
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base') args.base = argv[++i];
    else if (a === '--threshold') args.threshold = Number(argv[++i]);
    else if (a === '--lcov') args.lcov = argv[++i];
    else if (a === '--src') args.src = argv[++i];
    else if (a === '--exclude') args.exclude.push(argv[++i]);
    else if (a === '-h' || a === '--help') {
      console.log('用法: diff-coverage.mjs --base <ref> --threshold <n> --lcov <path> --src <dir> --exclude <glob>');
      process.exit(0);
    }
  }
  return args;
}

/** 解析 lcov.info → Map<repoRelativePath, Set<coveredLineNum>> */
function parseLcov(lcovPath, cwd) {
  if (!existsSync(lcovPath)) {
    throw new Error(`lcov 未找到：${lcovPath}（请先跑 pnpm test:coverage 生成覆盖率）`);
  }
  const cov = new Map();
  const text = readFileSync(lcovPath, 'utf-8');
  let curSet = null;
  let curFile = null;
  for (const line of text.split('\n')) {
    if (line.startsWith('SF:')) {
      let p = line.slice(3).trim();
      // 归一化为仓库相对路径
      if (p.startsWith(cwd + '/')) {
        p = p.slice(cwd.length + 1);
      } else if (path.isAbsolute(p)) {
        const idx = p.indexOf('/src/');
        if (idx >= 0) p = p.slice(idx + 1);
      }
      curFile = p;
      curSet = new Set();
      cov.set(curFile, curSet);
    } else if (line.startsWith('DA:')) {
      // DA:<line>,<hitCount>[,<checksum>]
      const parts = line.slice(3).split(',');
      const ln = Number(parts[0]);
      const hit = Number(parts[1]);
      if (curSet && hit > 0) curSet.add(ln);
    } else if (line === 'end_of_record') {
      curFile = null;
      curSet = null;
    }
  }
  return cov;
}

/** git diff（unified=0）→ Map<repoRelativePath, number[]> 新增行号 */
function getAddedLines(base, srcDir, excludes) {
  const added = new Map();
  let diff;
  // pathspec：包含 srcDir，排除 excludes（与 coverage exclude 对齐）
  const pathspecs = [`'${srcDir}/**'`]
    .concat(excludes.map((e) => `':(exclude)${e}'`))
    .join(' ');
  try {
    diff = execSync(
      `git diff --unified=0 --no-color ${base}...HEAD -- ${pathspecs}`,
      { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 },
    );
  } catch (e) {
    throw new Error(
      `git diff 失败（base=${base}）：${(e.stderr || e.message || '').toString().split('\n')[0]}`,
    );
  }
  let curLines = null;
  let lineNo = 0;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ ')) {
      let p = line.slice(4).trim();
      if (p === '/dev/null') {
        curLines = null;
        continue;
      }
      if (p.startsWith('b/')) p = p.slice(2);
      curLines = [];
      added.set(p, curLines);
    } else if (line.startsWith('@@')) {
      const m = line.match(/\+(\d+)(?:,(\d+))? @@/);
      if (m) lineNo = Number(m[1]);
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      if (curLines) curLines.push(lineNo);
      lineNo++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      // 删除行：新文件行号不前进
    } else if (line.startsWith(' ')) {
      // context 行：新文件行号前进（-U0 下通常无）
      lineNo++;
    }
  }
  // 过滤空文件
  for (const [k, v] of added) if (v.length === 0) added.delete(k);
  return added;
}

function main() {
  const args = parseArgs(process.argv);
  const cwd = process.cwd();
  const cov = parseLcov(args.lcov, cwd);
  const added = getAddedLines(args.base, args.src, args.exclude);

  let totalAdded = 0;
  let coveredAdded = 0;
  const report = [];
  for (const [file, lines] of added) {
    const covSet = cov.get(file);
    const covered = covSet ? lines.filter((l) => covSet.has(l)).length : 0;
    totalAdded += lines.length;
    coveredAdded += covered;
    report.push({
      file,
      added: lines.length,
      covered,
      uncovered: lines.length - covered,
      pct: lines.length ? Math.round((covered / lines.length) * 100) : 100,
    });
  }

  const pct = totalAdded ? (coveredAdded / totalAdded) * 100 : 100;
  const pass = pct >= args.threshold;

  console.log(`[diff-coverage] base=${args.base} src=${args.src} threshold=${args.threshold}%`);
  if (totalAdded === 0) {
    console.log('[diff-coverage] 无新增代码行（src/**），跳过门禁 → PASS');
    process.exit(0);
  }
  console.log(`[diff-coverage] 新增行覆盖率：${coveredAdded}/${totalAdded} = ${pct.toFixed(2)}%`);
  // 按未覆盖数倒序输出明细
  report.sort((a, b) => b.uncovered - a.uncovered);
  for (const r of report) {
    const flag = r.pct >= 100 ? '✓' : r.pct >= args.threshold ? '~' : '✗';
    console.log(`  ${flag} ${r.file}  新增 ${r.added} / 覆盖 ${r.covered} (${r.pct}%)`);
  }
  if (pass) {
    console.log(`[diff-coverage] PASS（${pct.toFixed(2)}% ≥ ${args.threshold}%）`);
    process.exit(0);
  } else {
    console.error(
      `[diff-coverage] FAIL：新增代码覆盖率 ${pct.toFixed(2)}% 低于阈值 ${args.threshold}%，请为新增代码补单测`,
    );
    process.exit(1);
  }
}

main();
