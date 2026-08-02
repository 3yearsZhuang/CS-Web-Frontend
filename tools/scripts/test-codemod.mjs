// Test codemod: insert `await` before async service calls (2339/2345) and
// async-ify `it`/`test` callbacks that contain `await` (2378).
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

// nearest preceding declaration start (<= pos) for a given variable name
function nearestDecl(varInit, name, pos) {
  let best = undefined;
  for (const d of varInit) {
    if (d.name === name && d.start <= pos && (best === undefined || d.start > best)) best = d.start;
  }
  return best;
}

// unwrap NonNull (!), As (as), Parenthesized to the underlying expression
function unwrap(n) {
  while (ts.isNonNullExpression(n) || ts.isAsExpression(n) || ts.isParenthesizedExpression(n)) n = n.expression;
  return n;
}

function findCall(n) {
  while (ts.isParenthesizedExpression(n) || ts.isAsExpression(n) || ts.isNonNullExpression(n)) n = n.expression;
  return ts.isCallExpression(n) ? n : null;
}

function compute(file, diags) {
  const source = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const varInit = []; // {name, start} — array so reused names keep all decls
  const itCallbacks = []; // {node, start}
  ts.forEachChild(sf, function walk(n) {
    if (
      ts.isVariableDeclaration(n) &&
      ts.isIdentifier(n.name) &&
      n.initializer &&
      !ts.isAwaitExpression(n.initializer)
    ) {
      varInit.push({ name: n.name.text, start: n.initializer.getStart(sf) });
    }
    if (
      (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && (n.expression.text === 'it' || n.expression.text === 'test')) &&
      n.arguments.length >= 2 &&
      (ts.isFunctionExpression(n.arguments[1]) || ts.isArrowFunction(n.arguments[1]))
    ) {
      itCallbacks.push(n.arguments[1]);
    }
    ts.forEachChild(n, walk);
  });

  const lines = source.split('\n');
  const lineStart = [];
  let acc = 0;
  for (const ln of lines) { lineStart.push(acc); acc += ln.length + 1; }
  const posOf = (line, col) => lineStart[line - 1] + (col - 1);

  const edits = []; // {start, kind:'await'|'async'}
  for (const d of diags) {
    if (d.code !== 2339 && d.code !== 2345 && d.code !== 2378 && d.code !== 7053 && d.code !== 2352) continue;
    const pos = posOf(d.line, d.col);
    const node = findNodeAt(sf, pos);
    if (!node) continue;
    if (d.code === 2378) {
      // make enclosing it/test callback async
      let p = node;
      while (p && !itCallbacks.includes(p)) p = p.parent;
      if (p && !p.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword)) {
        edits.push({ start: p.getStart(sf), kind: 'async' });
      }
      continue;
    }
    let target = null;
    let needParens = false;
    if (d.code === 2339 || d.code === 7053) {
      let pa = node;
      while (pa && !ts.isPropertyAccessExpression(pa) && !ts.isElementAccessExpression(pa)) pa = pa.parent;
      if (pa) {
        const call = findCall(pa.expression);
        if (call) target = call.getStart(sf);
        else {
          const base = unwrap(pa.expression);
          if (ts.isIdentifier(base)) {
            const cs = nearestDecl(varInit, base.text, pos);
            if (cs !== undefined) target = cs;
          }
        }
      }
    } else if (d.code === 2352) {
      // `await X() as T` must become `(await X()) as T`
      const call = findCall(node);
      if (call) { target = call.getStart(sf); needParens = true; }
    } else if (d.code === 2345) {
      const call = findCall(node);
      if (call) target = call.getStart(sf);
      else {
        let root = node;
        while (root && (ts.isPropertyAccessExpression(root) || ts.isElementAccessExpression(root) || ts.isParenthesizedExpression(root))) root = root.expression;
        root = unwrap(root);
        if (root && ts.isIdentifier(root)) {
          const cs = nearestDecl(varInit, root.text, pos);
          if (cs !== undefined) target = cs;
        }
      }
    }
    if (target !== null && target !== undefined) edits.push({ start: target, kind: 'await', needParens });
  }
  return { source, edits };
}

function apply(file) {
  const src0 = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src0, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const diagsForFile = parseDiags(runTsc()).get(path.relative(ROOT, file).replace(/\\/g, '/'));
  if (!diagsForFile || !diagsForFile.length) return 0;
  const { source, edits } = compute(file, diagsForFile);
  if (!edits.length) return 0;
  // dedupe + sort descending by start
  const uniq = [...new Map(edits.map((e) => [e.start + ':' + e.kind, e])).values()].sort((a, b) => b.start - a.start);
  let newSrc = source;
  for (const e of uniq) {
    if (e.kind === 'await') {
      if (newSrc.slice(Math.max(0, e.start - 6), e.start) === 'await ') continue;
      if (e.needParens) {
        // find end of the call expression by balancing parentheses
        let i = e.start;
        let depth = 0;
        let inStr = false;
        let strCh = '';
        for (; i < newSrc.length; i++) {
          const ch = newSrc[i];
          if (inStr) {
            if (ch === strCh && newSrc[i - 1] !== '\\') inStr = false;
            continue;
          }
          if (ch === '"' || ch === "'" || ch === '`') { inStr = true; strCh = ch; continue; }
          if (ch === '(') depth++;
          else if (ch === ')') { depth--; if (depth === 0) { i++; break; } }
        }
        const end = i; // index just past the closing ')'
        newSrc = newSrc.slice(0, end) + ')' + newSrc.slice(end);
        newSrc = newSrc.slice(0, e.start) + '(await ' + newSrc.slice(e.start);
      } else {
        newSrc = newSrc.slice(0, e.start) + 'await ' + newSrc.slice(e.start);
      }
    } else {
      // insert 'async ' before the callback's `function`/`(` 
      const tok = newSrc.slice(e.start, e.start + 9);
      if (/^(async\s+)?function/.test(tok) || tok.startsWith('async')) continue;
      newSrc = newSrc.slice(0, e.start) + 'async ' + newSrc.slice(e.start);
    }
  }
  fs.writeFileSync(file, newSrc);
  return uniq.length;
}

let total = 0;
for (let pass = 0; pass < 8; pass++) {
  const out = runTsc();
  const diags = parseDiags(out);
  let did = 0;
  for (const file of files) {
    const f = path.relative(ROOT, file).replace(/\\/g, '/');
    if (!diags.has(f)) continue;
    did += apply(file);
  }
  total += did;
  console.log(`pass ${pass}: fixed ${did}`);
  if (did === 0) break;
}
console.log(`TOTAL edits: ${total}`);
