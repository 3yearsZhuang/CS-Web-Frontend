import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // server-only 本地空实现，tsconfig paths 同步映射
      'server-only': path.resolve(__dirname, './src/shared/server-only.ts'),
    },
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['{src,tools/tests}/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['tools/tests/e2e/**', 'node_modules/**', '.build/**'],
    passWithNoTests: true,
    // 组件测试（.tsx）在文件顶部用 `// @vitest-environment jsdom` 指定 DOM 环境
    setupFiles: ['./tools/tests/setup-dom.ts'],
  },
});
