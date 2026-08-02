/**
 * 将 expect(() => asyncFn()).toThrow() 改写为 await expect(asyncFn()).rejects.toThrow()
 * 处理单/多行箭头，内部调用含嵌套括号也安全（基于 AST）。
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
    // 形如 expect(...).toThrow / .toThrowError
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isCallExpression(node.expression.expression) &&
      ts.isIdentifier(node.expression.expression.expression) &&
      node.expression.expression.expression.text === 'expect' &&
      (node.expression.name.text === 'toThrow' || node.expression.name.text === 'toThrowError')
    ) {
      const expectCall = node.expression.expression; // 外层 CallExpression: expect(...)
      if (expectCall.arguments.length === 1) {
        const arg = expectCall.arguments[0];
        if (
          ts.isArrowFunction(arg) &&
          !arg.async &&
          arg.parameters.length === 0 &&
          ts.isCallExpression(arg.body)
        ) {
          const inner = arg.body;
          const innerText = inner.getText(sf);
          const methodName = node.expression.name.text;
          // 替换整个 expect(arrow).toThrow() 调用（含末尾 .toThrow），避免重复
          const newText = `expect(${innerText}).rejects.${methodName}`;
          const start = expectCall.getStart(sf);
          const end = node.getEnd();
          edits.push({ start, end, text: newText });
          // 在 expect 前插入 await（仅当尚未 await）
          if (src.slice(Math.max(0, start - 6), start) !== 'await ') {
            edits.push({ start, end: start, text: 'await ' });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);

  if (!edits.length) return 0;
  // 从后往前应用
  edits.sort((a, b) => b.start - a.start);
  let newSrc = src;
  for (const e of edits) {
    newSrc = newSrc.slice(0, e.start) + e.text + newSrc.slice(e.end);
  }
  fs.writeFileSync(file, newSrc);
  return edits.length;
}

for (const f of files) {
  const p = path.resolve(f);
  if (!fs.existsSync(p)) continue;
  total += transform(p);
}
console.log(`expect-async-throw: ${total} edits`);
