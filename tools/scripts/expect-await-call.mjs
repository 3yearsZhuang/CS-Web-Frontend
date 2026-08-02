/**
 * 将 expect(asyncFn(...)).matcher 改写为 expect(await asyncFn(...)).matcher
 * 仅当：expect 未被 await 前置，且实参是 CallExpression（或其外包裹 AwaitExpression）。
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const files = process.argv.slice(2);
let total = 0;

function transform(file) {
  const src = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const edits = [];

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'expect' &&
      node.arguments.length >= 1
    ) {
      const arg = node.arguments[0];
      const isCall = ts.isCallExpression(arg) || (ts.isAwaitExpression(arg) && ts.isCallExpression(arg.expression));
      if (isCall && !ts.isAwaitExpression(arg)) {
        const expectStart = node.expression.getStart(sf);
        const parenPos = node.expression.getEnd(sf); // position of '(' after expect
        // 检查 expect 前是否已有 await
        const before = src.slice(Math.max(0, expectStart - 7), expectStart);
        if (!before.endsWith('await ') && !before.endsWith('await(')) {
          // 在 'expect(' 之后插入 'await '
          edits.push({ start: parenPos + 1, end: parenPos + 1, text: 'await ' });
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  if (!edits.length) return 0;
  edits.sort((a, b) => b.start - a.start);
  let newSrc = src;
  for (const e of edits) newSrc = newSrc.slice(0, e.start) + e.text + newSrc.slice(e.end);
  fs.writeFileSync(file, newSrc);
  return edits.length;
}

for (const f of files) {
  const p = path.resolve(f);
  if (fs.existsSync(p)) total += transform(p);
}
console.log(`expect-await-call: ${total} edits`);
