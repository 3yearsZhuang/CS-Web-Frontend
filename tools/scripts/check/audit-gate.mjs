#!/usr/bin/env node
/**
 * @file pnpm audit 门禁（audit-gate.mjs）
 *
 * 读取 `pnpm audit --json` 输出，high 及以上漏洞即失败——但允许通过
 * package.json `pnpm.auditConfig.ignoreGhsas` 登记的 GHSA 豁免。
 *
 * 为什么不直接用 pnpm auditConfig：CI 锁定 pnpm@9.0.0，该版本静默不读取
 * auditConfig（实测确认），故以本脚本显式裁决；豁免登记仍写在 package.json，
 * 未来升级 pnpm 后两条路径等价。
 *
 * 用法：pnpm audit --json --registry ... > /tmp/audit.json && node audit-gate.mjs /tmp/audit.json
 */
import { readFileSync } from 'node:fs';

const [, , auditPath] = process.argv;
if (!auditPath) {
  console.error('[audit-gate] 用法: node audit-gate.mjs <pnpm-audit --json 输出文件>');
  process.exit(2);
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const ignoreGhsas = new Set(pkg?.pnpm?.auditConfig?.ignoreGhsas ?? []);

const raw = JSON.parse(readFileSync(auditPath, 'utf8'));
// pnpm --json 兼容两种形状：npm 风格 { advisories: { <id>: {...} } } 与数组
const advisories = Array.isArray(raw?.advisories)
  ? raw.advisories
  : Object.values(raw?.advisories ?? {});

const BLOCKING = new Set(['high', 'critical']);
const offenders = [];

for (const a of advisories) {
  const severity = String(a.severity ?? '').toLowerCase();
  if (!BLOCKING.has(severity)) continue;
  const ghsa = String(a.url ?? '').split('/').pop() || a.github_advisory_id || a.id;
  if (ignoreGhsas.has(ghsa)) {
    console.log(`[audit-gate] 豁免 ${ghsa}（${a.module_name}，${severity}）——已登记于 package.json pnpm.auditConfig.ignoreGhsas`);
    continue;
  }
  offenders.push({ ghsa, module: a.module_name, severity, title: a.title, url: a.url });
}

if (offenders.length > 0) {
  console.error('[audit-gate] FAIL：存在未豁免的高危漏洞');
  for (const o of offenders) {
    console.error(`  - ${o.module} [${o.severity}] ${o.title} ${o.url}`);
  }
  process.exit(1);
}

console.log('[audit-gate] PASS：无未豁免的高危（high+）漏洞');
