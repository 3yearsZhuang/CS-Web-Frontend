// Fast await-codemod: run tsc once for all diagnostics, fix each file in one pass
// (sorted-descending insertion so positions stay valid), then loop tsc a few times
// for cascades. Operates on a list of files (or all files with errors from a tsc dump).
import { execFileSync } from 'node:child_process';
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const files = process.argv.slice(2);

function runTsc() {
  try {
    return execFileSync('npx', ['tsc', '--noEmit', '--pretty', 'false', '-p', 'tsconfig.json'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    return (e.stdout || '') + (e.stderr || '');
  }
}

function parseDiags(out) {
  const norm = (p) => p.replace(/\\/g, '/');
  const map = new Map();
  for (const line of out.split('\n')) {
    const m = line.match(/^(.+?)\((\d+),(\d+)\):\s*error TS(\d+):\s*(.*)$/);
    if (!m) continue;
    const f = norm(m[1]);
    if (!map.has(f)) map.set(f, []);
    map.get(f).push({ line: Number(m[2]), col: Number(m[3]), code: Number(m[4]), msg: m[5] });
  }
  return map;
}

function findNodeAt(node, pos) {
  let result = null;
  function visit(n) {
    if (n.getStart() <= pos && pos < n.getEnd()) {
      result = n;
      ts.forEachChild(n, visit);
    }
  }
  ts.forEachChild(node, visit);
  return result || node;
}

function findAwaitableCall(expr) {
  let n = expr;
  while (ts.isParenthesizedExpression(n) || ts.isAsExpression(n) || ts.isNonNullExpression(n)) n = n.expression;
  if (ts.isAwaitExpression(n)) return null;
  if (ts.isCallExpression(n)) return n;
  let p = n;
  while (p && !ts.isCallExpression(p)) {
    if (ts.isAwaitExpression(p)) return null;
    const parent = p.parent;
    if (!parent) break;
    if (ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent) || ts.isCallExpression(parent)) p = parent;
    else break;
  }
  return ts.isCallExpression(p) ? p : null;
}

function computeAwaitStarts(sourceFile, sf, diagsForFile) {
  const varInitStart = new Map();
  ts.forEachChild(sf, function walk(n) {
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer) {
      // 捕获任何初始化器起点（包括三元/二元的 Promise 表达式），供 2339 时 await。
      varInitStart.set(n.name.text, n.initializer.getStart(sf));
    }
    ts.forEachChild(n, walk);
  });

  const lines = sourceFile.split('\n');
  const lineStart = [];
  let acc = 0;
  for (const ln of lines) { lineStart.push(acc); acc += ln.length + 1; }
  const posOf = (line, col) => lineStart[line - 1] + (col - 1);

  const starts = [];
  for (const d of diagsForFile) {
    if (d.code !== 2339 && d.code !== 2345) continue;
    const pos = posOf(d.line, d.col);
    const node = findNodeAt(sf, pos);
    if (!node) continue;
    let target = null; // {start, wrap} or null
    if (d.code === 2339) {
      let pa = node;
      while (pa && !ts.isPropertyAccessExpression(pa)) pa = pa.parent;
      if (pa) {
        const call = findAwaitableCall(pa.expression);
        if (call) {
          target = { start: call.getStart(sf), wrap: !ts.isCallExpression(call) };
        } else if (ts.isIdentifier(pa.expression)) {
          const cs = varInitStart.get(pa.expression.text);
          if (cs !== undefined) target = { start: cs, wrap: true };
        }
      }
    } else if (d.code === 2345) {
      const call = findAwaitableCall(node);
      if (call) {
        target = { start: call.getStart(sf), wrap: !ts.isCallExpression(call) };
      } else {
        let root = node;
        while (root && (ts.isPropertyAccessExpression(root) || ts.isElementAccessExpression(root) || ts.isParenthesizedExpression(root))) {
          root = root.expression;
        }
        if (root && ts.isIdentifier(root)) {
          const cs = varInitStart.get(root.text);
          if (cs !== undefined) target = { start: cs, wrap: true };
        }
      }
    }
    if (target !== null) starts.push(target);
  }
  return starts;
}

function fixFileOnce(file, diagsForFile) {
  const source = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const starts = computeAwaitStarts(source, sf, diagsForFile);
  if (starts.length === 0) return 0;
  const uniq = [...new Set(starts.map((s) => s.start + ':' + s.wrap))].map((k) => {
    const [s, w] = k.split(':');
    return { start: Number(s), wrap: w === 'true' };
  }).sort((a, b) => b.start - a.start);
  let newSrc = source;
  for (const { start, wrap } of uniq) {
    const before = newSrc.slice(Math.max(0, start - 7), start);
    if (/\bawait\s*$/.test(before)) continue;
    newSrc = newSrc.slice(0, start) + (wrap ? 'await (' : 'await ') + newSrc.slice(start);
    if (wrap) {
      // 在表达式末尾（行尾或 ; 或 ) 之前）插入配对的 )
      // 简单策略：在 initializer 行尾插入 )。用括号配对更稳妥，这里在末尾加 )
      newSrc = insertClosingParen(newSrc, start);
    }
  }
  fs.writeFileSync(file, newSrc);
  return uniq.length;
}

// 在 start 处的表达式末尾插入配对的 )。简单实现：找到与 start 处最外层表达式匹配的结束位置。
function insertClosingParen(src, start) {
  // 统计后续括号深度，遇到深度回到 0 且不在字符串/注释中时插入 )
  let depth = 0;
  let i = start;
  const n = src.length;
  // 跳过起始 whitespace
  while (i < n && /\s/.test(src[i])) i++;
  let inStr = null;
  for (; i < n; i++) {
    const c = src[i];
    if (inStr) {
      if (c === inStr && src[i - 1] !== '\\') inStr = null;
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') {
      depth--;
      if (depth < 0) { return src.slice(0, i) + ')' + src.slice(i); }
    } else if (c === ';' || c === '\n') {
      if (depth <= 0) return src.slice(0, i) + ')' + src.slice(i);
    }
  }
  return src + ')';
}

let total = 0;
for (let pass = 0; pass < 4; pass++) {
  const out = runTsc();
  const diags = parseDiags(out);
  let did = 0;
  for (const file of files) {
    const f = path.relative(ROOT, file).replace(/\\/g, '/');
    const d = diags.get(f);
    if (!d) continue;
    const n = fixFileOnce(file, d);
    if (n) { did += n; total += n; }
  }
  console.log(`pass ${pass}: fixed ${did} await(s)`);
  if (did === 0) break;
}
console.log(`TOTAL await inserted: ${total}`);
