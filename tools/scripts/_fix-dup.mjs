import fs from 'node:fs';
const files = ['tools/tests/join.test.ts', 'tools/tests/password-policy.test.ts', 'tools/tests/permissions-hunt.test.ts'];
for (const f of files) {
  let s = fs.readFileSync(f, 'utf8');
  s = s.replace(/\.rejects\.toThrow\.toThrow\b/g, '.rejects.toThrow');
  s = s.replace(/\.rejects\.toThrowError\.toThrowError\b/g, '.rejects.toThrowError');
  fs.writeFileSync(f, s);
  console.log('cleaned', f);
}
