// Make `it`/`test` callbacks async when they contain `await` but lack `async`.
import ts from 'typescript';
import fs from 'node:fs';

const listFile = process.env.ASYNCIFY_LIST || 'tools/scripts/_asyncify-files.txt';
const files = fs.readFileSync(listFile, 'utf8')
  .split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  .filter((f) => f.endsWith('.test.ts'));

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const edits = []; // start positions to insert 'async '
  ts.forEachChild(sf, function walk(n) {
    if (
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      (n.expression.text === 'it' || n.expression.text === 'test' ||
       n.expression.text === 'beforeEach' || n.expression.text === 'afterEach' ||
       n.expression.text === 'beforeAll' || n.expression.text === 'afterAll') &&
      n.arguments.length >= 1 &&
      (ts.isFunctionExpression(n.arguments[n.arguments.length - 1]) || ts.isArrowFunction(n.arguments[n.arguments.length - 1]))
    ) {
      const cb = n.arguments[n.arguments.length - 1];
      const isAsync = cb.modifiers?.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
      if (!isAsync && containsAwait(cb)) {
        edits.push(cb.getStart(sf));
      }
    }
    ts.forEachChild(n, walk);
  });

  if (!edits.length) continue;
  const uniq = [...new Set(edits)].sort((a, b) => b - a);
  let newSrc = source;
  for (const start of uniq) {
    const tok = newSrc.slice(start, start + 9);
    if (/^(async\s+)?function/.test(tok) || tok.startsWith('async ')) continue;
    newSrc = newSrc.slice(0, start) + 'async ' + newSrc.slice(start);
  }
  fs.writeFileSync(file, newSrc);
  console.log(`${file}: +${uniq.length} async`);
}

function containsAwait(node) {
  let found = false;
  function visit(n) {
    if (found) return;
    if (ts.isAwaitExpression(n)) { found = true; return; }
    ts.forEachChild(n, visit);
  }
  visit(node);
  return found;
}
