// Add `await` to bare call statements (inside a function body) whose callee is
// an imported async service function. Excludes vitest/DB framework identifiers
// and top-level (module-scope) statements. Skips already-awaited calls and
// member-expression calls (e.g. vi.mocked(...)).
import ts from 'typescript';
import fs from 'node:fs';

const DENY = new Set([
  'describe', 'it', 'test', 'expect', 'beforeEach', 'afterEach',
  'beforeAll', 'afterAll', 'vi', 'Database', '_setDbEngineForTest',
  'createSqliteTestEngine',
]);

const listFile = process.env.ASYNCIFY_LIST || 'tools/scripts/_asyncify-files.txt';
const files = fs.readFileSync(listFile, 'utf8')
  .split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  .filter((f) => f.endsWith('.test.ts'));

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  const imported = new Set();
  for (const n of sf.statements) {
    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) {
      const clause = n.importClause;
      if (!clause) continue;
      if (clause.name) imported.add(clause.name.text);
      const named = clause.namedBindings;
      if (named && ts.isNamedImports(named)) {
        for (const el of named.elements) imported.add(el.name.text);
      }
    }
  }

  const edits = [];
  function isBareAsyncCall(stmt) {
    if (!ts.isExpressionStatement(stmt)) return false;
    let expr = stmt.expression;
    if (ts.isAwaitExpression(expr)) return false;
    if (!ts.isCallExpression(expr)) return false;
    const callee = expr.expression;
    if (ts.isIdentifier(callee) && imported.has(callee.text) && !DENY.has(callee.text)) return true;
    return false;
  }

  // `const x = asyncFn()` — await the initializer.
  function isAsyncAssign(stmt) {
    if (!ts.isVariableStatement(stmt)) return false;
    const decl = stmt.declarationList.declarations[0];
    if (!decl || !decl.initializer) return false;
    let init = decl.initializer;
    if (ts.isAwaitExpression(init)) return false;
    if (!ts.isCallExpression(init)) return false;
    const callee = init.expression;
    if (ts.isIdentifier(callee) && imported.has(callee.text) && !DENY.has(callee.text)) return true;
    return false;
  }

  // Only consider calls that live inside a function body (inFunc === true).
  function walk(n, inFunc) {
    if (
      ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) ||
      ts.isArrowFunction(n) || ts.isMethodDeclaration(n)
    ) {
      inFunc = true;
    }
    if (isBareAsyncCall(n) && inFunc) {
      edits.push(n.getStart(sf));
    }
    if (isAsyncAssign(n) && inFunc) {
      const decl = n.declarationList.declarations[0];
      edits.push(decl.initializer.getStart(sf));
    }
    ts.forEachChild(n, (c) => walk(c, inFunc));
  }
  walk(sf, false);

  if (!edits.length) continue;
  const uniq = [...new Set(edits)].sort((a, b) => b - a);
  let newSrc = source;
  for (const start of uniq) {
    if (/^\s*await\b/.test(newSrc.slice(start, start + 12))) continue;
    newSrc = newSrc.slice(0, start) + 'await ' + newSrc.slice(start);
  }
  fs.writeFileSync(file, newSrc);
  console.log(`${file}: +${uniq.length} await`);
}
