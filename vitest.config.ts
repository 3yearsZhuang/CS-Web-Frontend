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
    passWithNoTests: false,
    // 组件测试（.tsx）在文件顶部用 `// @vitest-environment jsdom` 指定 DOM 环境
    setupFiles: ['./tools/tests/setup-dom.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/**/__mocks__/**',
        'src/**/*.d.ts',
        // Next.js 路由壳：由 E2E 覆盖，不计入单测覆盖率
        'src/app/**/layout.tsx',
        'src/app/**/page.tsx',
        'src/app/**/loading.tsx',
        'src/app/**/error.tsx',
        'src/app/**/not-found.tsx',
        'src/app/**/globals.css',
        // 纯翻译数据（非可测代码），计入会拖低覆盖率与 diff 门禁公平性
        'src/i18n/messages/**',
      ],
      // 3b：基线地板（防下滑起步）。实测基线（vitest 文本报表列序 Stmts|Branch|Funcs|Lines）：
      // statements 10.4 / branches 7.34 / functions 8.2 / lines 11.19，向下取整设阈值。
      // 后续随测试补全渐进上调至 50%（见 ER-13）。
      thresholds: {
        lines: 11,
        functions: 8,
        branches: 7,
        statements: 10,
      },
    },
  },
});
