#!/usr/bin/env node
// BFF · routeHandler 工厂采用门禁（冻结增量）
// ----------------------------------------------------------------------------
// 背景：src/app/api 有 160 个手写 route.ts / 7170 行，其中 149 个各自手抄
// 「proxy 调用 + authPair/clearAuth 接线 + 错误包装」。手抄带来两类系统性缺陷：
//   - A06：错误分支只 clearAuthCookies、不 setAuthCookies，401→刷新成功→业务错误
//     后浏览器仍持旧 refresh，超宽限即触发会话家族撤销（实测 110 个路由有此风险）；
//   - 错误语义漂移：同一故障被映射成 401 / 500 / 200 空列表不等。
//
// 本门禁不要求一次性重写全部路由（那是无法有效 review 的巨型 diff），而是**冻结增量**：
//   - 基线文件 tools/scripts/check/bff-handler-baseline.json 记录当前「未采用工厂」的文件；
//   - 新增 route.ts 若既不在基线、又未使用 routeHandler（或 okJson/errJson/applyAuth），
//     → exit 1（禁止新增手抄样板）；
//   - 存量迁移完成后从基线移除（--update 重生成），基线只会单调收缩。
//
// 用法：
//   node tools/scripts/check/check-bff-handler.mjs            # 检查（CI 用）
//   node tools/scripts/check/check-bff-handler.mjs --update   # 重生成基线（评审后用）
// 退出码：0 = 无新增手抄；1 = 发现基线外的手抄路由（CI 应失败）。
// ----------------------------------------------------------------------------

import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const args = process.argv.slice(2);
const UPDATE = args.includes('--update');
const API_DIR = resolve('src/app/api');
const BASELINE_PATH = resolve('tools/scripts/check/bff-handler-baseline.json');

/** 视为「已采用统一接线」的标志：任选其一即可（工厂 / 共享原语 / Cookie 统一落地） */
const MANAGED_MARKERS = [
  'routeHandler',
  'applyAuth',
  'okJson',
  'errJson',
];

/** 递归收集 route.ts */
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name === 'route.ts') out.push(p);
  }
  return out;
}

function isManaged(src) {
  return MANAGED_MARKERS.some((m) => src.includes(m));
}

if (!existsSync(API_DIR)) {
  console.log(`[check-bff-handler] 目录不存在，跳过：${API_DIR}`);
  process.exit(0);
}

const files = walk(API_DIR);
const unmanaged = files
  .filter((f) => !isManaged(readFileSync(f, 'utf8')))
  .map((f) => relative(process.cwd(), f).split('\\').join('/'))
  .sort();

if (UPDATE) {
  writeFileSync(BASELINE_PATH, JSON.stringify({ unmanaged }, null, 2) + '\n', 'utf8');
  console.log(`[check-bff-handler] 基线已更新：${unmanaged.length} 个文件待迁移`);
  process.exit(0);
}

if (!existsSync(BASELINE_PATH)) {
  console.error(
    '[check-bff-handler] 缺少基线文件 bff-handler-baseline.json；首次接入请先跑 --update 并提交。',
  );
  process.exit(1);
}

const baseline = new Set(JSON.parse(readFileSync(BASELINE_PATH, 'utf8')).unmanaged ?? []);
const violations = unmanaged.filter((f) => !baseline.has(f));
const migrated = [...baseline].filter((f) => !unmanaged.includes(f));

if (migrated.length > 0) {
  console.log(
    `[check-bff-handler] 提示：${migrated.length} 个文件已改用统一接线，可从基线移除（--update 收缩）`,
  );
}

if (violations.length > 0) {
  console.error(`[check-bff-handler] FAIL：${violations.length} 个新增路由未采用统一接线`);
  for (const v of violations) console.error(`  - ${v}`);
  console.error(
    '\n新增 BFF 路由 MUST 使用 src/shared/bff-route.ts 的 routeHandler，\n' +
      '或至少使用 okJson / errJson / applyAuth 统一处理 Cookie 写回（A06 防线）。',
  );
  process.exit(1);
}

console.log(
  `[check-bff-handler] OK：共 ${files.length} 个路由，基线内待迁移 ${baseline.size} 个，无新增手抄`,
);
process.exit(0);
