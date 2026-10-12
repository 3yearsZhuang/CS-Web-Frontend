#!/usr/bin/env node
// U-5 · 设计令牌漂移门禁（FrontDoc-05 / FrontDoc-UID §11 §16）
// ----------------------------------------------------------------------------
// 扫描 src/app 与 src/modules 下的 .ts/.tsx，阻断设计规范禁止清单中的写法
// 回流。命中即非零退出，CI 失败。
//
// 检查项（均为 UID §11/§16 MUST NOT）：
//   1. 硬编码十六进制颜色（颜色必须走 CSS 变量）
//   2. 白名单外圆角 rounded-md/lg/xl/2xl/3xl（白名单：--radius 输入框 /
//      capsule / rounded-full 圆形元素；任意值 rounded-[var(--radius)] 合法）
//   3. 违规阴影 shadow-lg/xl/2xl、ad-hoc shadow-[0...]、drop-shadow
//      （浮层必须走 --shadow-popover / --shadow-modal）
//   4. hover 浮起 hover:-translate-y / hover:scale、缓动 ease-in-out
//      （统一 var(--ease-ark) 慢出）
//   5. 裸 z-index 数字 z-10/20/30/40/50（必须 z-[var(--z-*)]）
//
// 豁免（FrontDoc-UID §17 / §15）：
//   - src/components/rhine/**、src/app/lab/**（Rhine 作用域）
//   - src/app/design-demo/**（验收基准页，含规范文档字符串数据）
//   - **/*.test.*（测试）
//   单行豁免：行尾加 `// design-gate-disable-line` 注释（须附原因）。
//
// 用法：node tools/scripts/check/check-design-tokens.mjs [--help]
// 退出码：0 = 通过；1 = 发现违规。
// ----------------------------------------------------------------------------

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('用法: node check-design-tokens.mjs');
  console.log('扫描 src/app 与 src/modules 的设计禁止清单违规，命中即退出码 1。');
  process.exit(0);
}

const ROOT = resolve('.');
const SCAN_DIRS = ['src/app', 'src/modules'];
const EXCLUDE_DIRS = ['src/components/rhine', 'src/app/lab', 'src/app/design-demo'];
const DISABLE_MARK = 'design-gate-disable-line';

/** @type {[string, RegExp, string][]} [规则名, 正则, 修复指引] */
const RULES = [
  [
    'hardcoded-hex-color',
    /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/,
    '颜色必须引用 CSS 变量（var(--primary) 等）；新语义色先在 globals.css 注册 token',
  ],
  [
    'non-whitelist-radius',
    /\brounded-(?:md|lg|xl|2xl|3xl|t-xl|t-2xl|b-xl|b-2xl)\b/,
    '直角为默认；白名单：rounded-[var(--radius)]（输入框）/ capsule / rounded-full（圆形元素）',
  ],
  [
    'forbidden-shadow',
    /\bshadow-(?:lg|xl|2xl)\b|\bdrop-shadow\b|shadow-\[0/,
    '浮层阴影必须走 token：shadow-[var(--shadow-popover)] / shadow-[var(--shadow-modal)]',
  ],
  [
    'hover-lift-or-bounce',
    /hover:-?translate-y|hover:scale-|\bease-in-out\b/,
    '卡片只有边框变色；缓动统一 var(--ease-ark)（慢出无弹跳）',
  ],
  [
    'raw-z-index',
    /\bz-(?:30|40|50|60|70)\b/,
    '全局层级（30/40/50…）必须引用 token：z-[var(--z-sticky|--z-banner|--z-header|--z-toast|--z-transition)]；组件内部局部堆叠（z-10/z-20）不在此门禁范围',
  ],
];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

/** @type {{ file: string, line: number, rule: string, text: string, hint: string }[]} */
const violations = [];

for (const dir of SCAN_DIRS) {
  for (const file of walk(resolve(ROOT, dir))) {
    const rel = relative(ROOT, file);
    if (EXCLUDE_DIRS.some((ex) => rel.startsWith(ex))) continue;
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((text, idx) => {
      if (text.includes(DISABLE_MARK)) return;
      const trimmed = text.trim();
      // 纯注释行不算违规（如 "// z-50 确保在最上层" 的说明文字）
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('{/*')) return;
      for (const [rule, re, hint] of RULES) {
        if (re.test(text)) {
          violations.push({ file: rel, line: idx + 1, rule, text: text.trim(), hint });
        }
      }
    });
  }
}

if (violations.length === 0) {
  console.log('✓ 设计令牌门禁通过：0 违规（' + SCAN_DIRS.join(' + ') + '）');
  process.exit(0);
}

console.error('✗ 设计令牌门禁失败：' + violations.length + ' 处违规\n');
for (const v of violations) {
  console.error('  ' + v.file + ':' + v.line + '  [' + v.rule + ']');
  console.error('    ' + v.text.slice(0, 120));
  console.error('    → ' + v.hint);
}
console.error('\n规范：tools/docs/FrontDoc-UID.md §11/§16；治理方案：FrontDoc-05-DesignUnify.md');
process.exit(1);
