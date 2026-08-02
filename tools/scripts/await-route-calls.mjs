// Add `await` to calls of async service functions imported from server modules
// in API route files. ADR-009 migrated all service functions to async; routes
// that call them without `await` serialize a Promise to `{}` at runtime.
//
// Strategy: collect identifiers imported from `@/modules/*/server`,
// `@/shared/security/audit`, `@/shared/db/repositories`, `@/shared/db` (server
// side) and prefix their call sites with `await` wherever the parent is not
// already an AwaitExpression. Awaiting a non-Promise return value is a no-op,
// so this is safe for both async and still-sync helpers from those modules.
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';

const API_DIR = 'src/app/api';
const ALLOW_PREFIXES = [
  '@/modules',
  '@/shared/security/audit',
  '@/shared/db/repositories',
  '@/shared/db',
];

function collectRouteFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectRouteFiles(full));
    else if (entry.name === 'route.ts') out.push(full);
  }
  return out;
}

const files = collectRouteFiles(API_DIR);
let totalEdits = 0;

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  // 1. collect imported server-side identifiers
  const serverIds = new Set();
  for (const n of sf.statements) {
    if (!ts.isImportDeclaration(n) || !ts.isStringLiteral(n.moduleSpecifier)) continue;
    const spec = n.moduleSpecifier.text;
    if (!ALLOW_PREFIXES.some((p) => spec === p || spec.startsWith(p + '/'))) continue;
    const clause = n.importClause;
    if (!clause) continue;
    if (clause.name) serverIds.add(clause.name.text);
    const named = clause.namedBindings;
    if (named && ts.isNamedImports(named)) {
      for (const el of named.elements) serverIds.add(el.name.text);
    }
  }
  if (serverIds.size === 0) continue;

  // 2. find all CallExpressions whose callee is a server id and parent is not Await
  const editStarts = [];
  function isServerCall(n) {
    return (
      ts.isCallExpression(n) &&
      ts.isIdentifier(n.expression) &&
      serverIds.has(n.expression.text)
    );
  }
  function walk(n) {
    if (isServerCall(n)) {
      const parent = n.parent;
      if (!(parent && ts.isAwaitExpression(parent))) {
        editStarts.push(n.getStart(sf));
      }
    }
    ts.forEachChild(n, walk);
  }
  walk(sf);

  if (editStarts.length === 0) continue;

  // apply from right to left so offsets stay valid
  const uniq = [...new Set(editStarts)].sort((a, b) => b - a);
  let newSrc = source;
  for (const start of uniq) {
    // double-check not already preceded by await (defensive)
    if (/^\s*await\b/.test(newSrc.slice(start - 6, start))) continue;
    newSrc = newSrc.slice(0, start) + 'await ' + newSrc.slice(start);
  }
  fs.writeFileSync(file, newSrc);
  totalEdits += uniq.length;
  console.log(`${file}: +${uniq.length} await`);
}

console.log(`\nDONE. total edits: ${totalEdits}`);
