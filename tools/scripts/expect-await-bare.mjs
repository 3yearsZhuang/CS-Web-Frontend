/**
 * 为测试体中「丢弃结果的裸异步调用语句」(如 publishExam(x); endExam(x);) 添加 await，
 * 避免状态机测试因竞态导致断言错位。
 * 规则：ExpressionStatement 且其表达式为 CallExpression，callee 不是 expect，且未加 await。
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
    if (ts.isExpressionStatement(node) && ts.isCallExpression(node.expression)) {
      const callee = node.expression.expression;
      const calleeName = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : '';
      if (calleeName === 'expect') return; // expect(...) 语句不处理
      // 已 await 的跳过
      if (ts.isAwaitExpression(node.expression)) return;
      const start = node.getStart(sf);
      const before = src.slice(Math.max(0, start - 7), start);
      if (before.endsWith('await ') || before.endsWith('await(')) return;
      edits.push({ start, text: 'await ' });
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  if (!edits.length) return 0;
  edits.sort((a, b) => b.start - a.start);
  let newSrc = src;
  for (const e of edits) newSrc = newSrc.slice(0, e.start) + e.text + newSrc.slice(e.start);
  fs.writeFileSync(file, newSrc);
  return edits.length;
}

for (const f of files) {
  const p = path.resolve(f);
  if (fs.existsSync(p)) total += transform(p);
}
console.log(`expect-await-bare: ${total} edits`);
