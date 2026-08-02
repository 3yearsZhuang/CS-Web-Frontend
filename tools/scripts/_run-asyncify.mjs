import { execSync } from 'node:child_process';
const files = [
  'tools/tests/announcement.test.ts',
  'tools/tests/blog-points.test.ts',
  'tools/tests/exam.test.ts',
  'tools/tests/resource.test.ts',
  'tools/tests/task.test.ts',
];
execSync(`node tools/scripts/test-asyncify.mjs ${files.join(' ')}`, { stdio: 'inherit' });
