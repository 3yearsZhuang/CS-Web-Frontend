#!/usr/bin/env node
/**
 * bff-routes.mjs — BFF route.ts 骨架生成器（C-15 真正交付物）
 *
 * 目标：把 openapi.baseline.json 的 172 路径 / 223 操作，自动产出使用
 * 现代化原语（proxyBackend / bodyOrEmpty / arrayFrom / okJson / errJson /
 * readJsonBody）的 route.ts 薄转发骨架，削减手写重复。
 *
 * 安全定位（重要）：
 *   - 默认 dry-run：骨架只写入草稿目录（--out，默认 <frontend>/.bff-scaffold），
 *     绝不触碰 src/app/api 下任何手写文件。
 *   - 自动对账：扫描现有手写 route.ts 的反向代理路径，标记每个 openapi 操作是
 *     COVERED（已被代理，含 comments↔replies / posts↔topics 这类目录重映射）还是
 *     NEW（尚未代理，需新建）。仅 NEW 端点才会被产出骨架。
 *   - --write 默认关闭；即便开启也只新建不存在的文件，绝不覆盖。
 *
 * 用法：
 *   node tools/scripts/fe/gen/bff-routes.mjs            # dry-run + 对账报告
 *   node tools/scripts/fe/gen/bff-routes.mjs --out DIR  # 指定草稿目录
 *   node tools/scripts/fe/gen/bff-routes.mjs --write    # 仅新建 NEW 文件到 src（谨慎）
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_ROOT = resolve(__dirname, '../../../..'); // tools/scripts/fe/gen -> frontend
const SRC_API = join(FRONTEND_ROOT, 'src', 'app', 'api');
const DEFAULT_OPENAPI = resolve(FRONTEND_ROOT, '..', 'openapi.baseline.json');

// ---- CLI ----
const argv = process.argv.slice(2);
const getFlag = (name) => {
  const i = argv.indexOf(name);
  return i >= 0 ? (argv[i + 1] || true) : undefined;
};
const OPENAPI = getFlag('--openapi') || DEFAULT_OPENAPI;
const OUT_DIR = getFlag('--out') || join(FRONTEND_ROOT, '.bff-scaffold');
const DO_WRITE = argv.includes('--write');
const NO_CHECK = argv.includes('--no-check');

const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch'];

// ---- helpers ----
const camel = (s) => s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());

function fsSegment(seg) {
  if (seg.startsWith('{') && seg.endsWith('}')) return `[${seg.slice(1, -1)}]`;
  return seg;
}
function dirFromPath(apiPath) {
  // /api/v1/community/posts/{post_id} -> community/posts/[post_id]
  const stripped = apiPath.replace(/^\/api\/v1/, '');
  const segs = stripped.split('/').filter(Boolean);
  return segs.map(fsSegment).join('/');
}
function strippedBackendPath(apiPath) {
  // 返回不含 /api/v1 的代理路径（生成代码里会替换为模板）
  return apiPath.replace(/^\/api\/v1/, '');
}
function paramNames(apiPath) {
  const out = [];
  const re = /\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(apiPath))) out.push(m[1]);
  return out;
}

// 规范化反向代理路径，用于「已被代理」对账：
//   去 query、去 ${...} 模板、去 {param}、合并斜杠、去尾斜杠
function normalizeProxyPath(p) {
  let s = String(p).split('?')[0];
  // 剔除 GET 代理模板末尾的查询串 `${url.search}`（它是 ?query，不是路径段，
  // 否则归一后会多出一个 `{}` 尾段，导致与 openapi 路径 `/x/{param}` 不匹配而误判 NEW）
  s = s.replace(/\$\{[^}]*search[^}]*\}/g, '');
  s = s.replace(/\$\{[^}]*\}/g, '{}');
  s = s.replace(/\/\{[^}]+\}/g, '/{}');
  s = s.replace(/\/{2,}/g, '/');
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
  return s;
}

function resolveProps(schema, components) {
  if (!schema) return null;
  if (schema.$ref) {
    const name = schema.$ref.split('/').pop();
    return resolveProps(components?.schemas?.[name], components);
  }
  if (schema.type === 'object' && schema.properties) return schema.properties;
  if (Array.isArray(schema.allOf)) {
    const merged = {};
    for (const sub of schema.allOf) {
      const p = resolveProps(sub, components);
      if (p) Object.assign(merged, p);
    }
    return merged;
  }
  return null;
}

// ---- 扫描现有手写 route.ts 的反向代理路径 ----
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else if (entry === 'route.ts') out.push(full);
  }
  return out;
}
function scanExistingProxies() {
  // 返回 [{ file, normalized }]
  const records = [];
  if (!existsSync(SRC_API)) return records;
  for (const file of walk(SRC_API)) {
    const text = readFileSync(file, 'utf8');
    const re = /path:\s*(`([^`]*)`|'([^']*)'|"([^"]*)")/g;
    let m;
    while ((m = re.exec(text))) {
      const raw = m[2] ?? m[3] ?? m[4] ?? '';
      if (!raw) continue;
      records.push({ file, normalized: normalizeProxyPath(raw) });
    }
  }
  return records;
}

// ---- 生成单文件骨架 ----
function buildFile(apiPath, ops) {
  const methods = Object.keys(ops).filter((m) => HTTP_METHODS.includes(m));
  const params = paramNames(apiPath);
  const stripped = strippedBackendPath(apiPath);
  const pathTmpl = stripped.replace(/\{([^}]+)\}/g, '${encodeURIComponent($1)}');

  // 收集用于生成 import / 逻辑的信息
  const hasWrite = methods.some((m) => ['post', 'put', 'patch'].includes(m));
  const tags = [...new Set(methods.flatMap((m) => ops[m].tags || []))];
  const opIds = methods.map((m) => ops[m].operationId).filter(Boolean);
  const summary = (ops[methods[0]].summary || '').trim();

  const imports = ['proxyBackend', 'bodyOrEmpty', 'okJson', 'errJson'];
  if (hasWrite) imports.push('readJsonBody');
  const importLine =
    'import {\n  ' +
    imports.map((i) => `${i},`).join('\n  ') +
    '\n} from \'@/shared/backend-client\';';

  const lines = [];
  lines.push('/**');
  lines.push(' * @file 由 bff-routes 生成器产出（C-15 脚手架）— 需人工补全字段映射与响应塑形后再启用');
  if (summary) lines.push(' * 摘要: ' + summary);
  if (tags.length) lines.push(' * tags: ' + tags.join(', '));
  if (opIds.length) lines.push(' * operationId: ' + opIds.join(', '));
  lines.push(' * 后端路径: ' + stripped + '  [' + methods.map((m) => m.toUpperCase()).join(', ') + ']');
  lines.push(' */');
  lines.push(importLine);
  lines.push('');
  lines.push("export const runtime = 'nodejs';");
  lines.push('');

  // 参数签名 fragments
  const paramsType = params.length
    ? `{ params }: { params: Promise<{ ${params.map((p) => `${p}: string`).join('; ')} }> }`
    : '';
  const destructure = params.length ? `  const { ${params.join(', ')} } = await params;` : '';

  for (const m of methods) {
    const op = ops[m];
    const method = m.toUpperCase();
    const isGet = m === 'get';
    const isDelete = m === 'delete';
    const isWrite = ['post', 'put', 'patch'].includes(m);
    const skipAuth =
      Array.isArray(op.security) && op.security.length === 0;

    // 代理路径（GET/写都转发原始 query）
    const sig = paramsType ? `req: Request, ${paramsType}` : 'req: Request';
    lines.push(`export async function ${method}(${sig}) {`);
    if (destructure) lines.push(destructure);
    if (isGet) {
      lines.push('  const url = new URL(req.url);');
    }
    const opts = [];
    opts.push(`    path: \`${pathTmpl}${isGet ? '${url.search}' : ''}\``);
    if (!isGet) opts.push(`    method: '${method}'`);
    if (skipAuth) opts.push('    skipAuth: true');

    if (isWrite) {
      lines.push('  const body = await readJsonBody(req);');
      // 请求体字段映射（若可解析 schema）
      const rb = op.requestBody?.content?.['application/json']?.schema;
      const props = resolveProps(rb, specComponents);
      let jsonBody;
      if (props && Object.keys(props).length) {
        const rows = Object.keys(props)
          .map((k) => `      ${k}: body.${camel(k)},`)
          .join('\n');
        jsonBody = '{\n' + rows + '\n    }';
        opts.push('    jsonBody: ' + jsonBody + ', // TODO: 复核 camel→snake 映射与必填/默认值');
      } else {
        opts.push('    jsonBody: body, // TODO: 补全请求体字段映射（camel→snake）');
      }
    }

    lines.push(`  const proxy = await proxyBackend(req, {`);
    lines.push(opts.join(',\n'));
    lines.push('  });');
    lines.push('');

    if (isGet) {
      lines.push('  if (proxy.status !== 200) {');
      lines.push("    return errJson(proxy, '请求失败');");
      lines.push('  }');
      lines.push('  // TODO: 按需塑形响应（arrayFrom / to* 映射 / 分页字段）');
      lines.push('  return okJson(bodyOrEmpty(proxy), proxy);');
    } else if (isDelete) {
      lines.push('  if (proxy.status !== 200) {');
      lines.push("    return errJson(proxy, '操作失败');");
      lines.push('  }');
      lines.push('  return okJson({ success: true }, proxy);');
    } else {
      lines.push('  if (proxy.status !== 200 && proxy.status !== 201) {');
      lines.push("    return errJson(proxy, '操作失败');");
      lines.push('  }');
      lines.push('  return okJson(proxy.body, proxy, { status: proxy.status });');
    }
    lines.push('}');
    lines.push('');
  }

  return lines.join('\n');
}

// ---- 主流程 ----
let specComponents = {};
const spec = JSON.parse(readFileSync(OPENAPI, 'utf8'));
specComponents = spec.components || {};
const paths = spec.paths || {};

// 预扫描现有代理，用于覆盖判定
const existing = scanExistingProxies();
const existingNorm = existing.map((e) => e.normalized);

function isCovered(normGen) {
  // 仅精确匹配：父子路由在 Next App Router 是独立文件，父存在≠子已代理；
  // comments↔replies / posts↔topics 的目录重映射同样靠精确归一匹配识别。
  for (const n of existingNorm) {
    if (n === normGen) return { covered: true, by: n };
  }
  return { covered: false, by: null };
}

// 聚合：每个 openapi path -> 方法映射
const items = [];
for (const apiPath of Object.keys(paths)) {
  const ops = paths[apiPath];
  const present = {};
  for (const m of HTTP_METHODS) if (ops[m]) present[m] = ops[m];
  if (Object.keys(present).length === 0) continue;
  const dir = dirFromPath(apiPath);
  const normGen = normalizeProxyPath(strippedBackendPath(apiPath));
  const cover = isCovered(normGen);
  items.push({ apiPath, dir, present, normGen, covered: cover.covered, coveredBy: cover.by });
}

// 仅对 NEW（未覆盖）产出骨架
const newItems = items.filter((it) => !it.covered);
const coveredItems = items.filter((it) => it.covered);

mkdirSync(OUT_DIR, { recursive: true });
const manifest = [];

for (const it of newItems) {
  const content = buildFile(it.apiPath, it.present);
  const outRel = join('src', 'app', 'api', it.dir, 'route.ts');
  const outAbs = join(OUT_DIR, outRel);
  mkdirSync(dirname(outAbs), { recursive: true });
  if (DO_WRITE) {
    // 仅新建：绝不覆盖已存在文件
    if (existsSync(join(FRONTEND_ROOT, outRel))) {
      manifest.push({ ...it, outRel, written: false, reason: 'exists-in-src-skip' });
      continue;
    }
    mkdirSync(dirname(join(FRONTEND_ROOT, outRel)), { recursive: true });
    writeFileSync(join(FRONTEND_ROOT, outRel), content);
    manifest.push({ ...it, outRel, written: true });
  } else {
    writeFileSync(outAbs, content);
    manifest.push({ ...it, outRel, written: false, draft: outRel });
  }
}

// 可选 TS 语法校验（用项目自带 typescript 转译）
let checkReport = { attempted: false };
if (!NO_CHECK) {
  try {
    const tsPath = join(FRONTEND_ROOT, 'node_modules', 'typescript');
    const require = createRequire(import.meta.url);
    const ts = require(tsPath);
    checkReport.attempted = true;
    checkReport.ok = 0;
    checkReport.fail = 0;
    checkReport.errors = [];
    const genFiles = DO_WRITE
      ? manifest.filter((m) => m.written).map((m) => join(FRONTEND_ROOT, m.outRel))
      : manifest.filter((m) => m.draft).map((m) => join(OUT_DIR, m.draft));
    for (const f of genFiles) {
      const src = readFileSync(f, 'utf8');
      // 用 createSourceFile(ScriptKind.TS) 做纯语法解析：避免 transpileModule
      // 在开启 JSX 时把 `Promise<{...}>` 的 `<{` 误判为 JSX（'<'/'>' 报错）的已知误报。
      // 该签名与现有手写 route.ts 完全一致，项目 tsc 可正常编译。
      const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
      const errs = (sf.parseDiagnostics || []).filter((d) => d.category === 1);
      if (errs.length) {
        checkReport.fail++;
        checkReport.errors.push({
          file: relative(OUT_DIR, f),
          errs: errs.map((e) => ts.flattenDiagnosticMessageText(e.messageText, '\n')),
        });
      } else {
        checkReport.ok++;
      }
    }
  } catch (e) {
    checkReport.attempted = true;
    checkReport.skipped = String(e.message || e);
  }
}

// 写 manifest + 对账报告
writeFileSync(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
const reconcile = [
  '# BFF route 骨架生成器 — 对账报告',
  '',
  `生成时间: ${new Date().toISOString()}`,
  `OpenAPI: ${relative(FRONTEND_ROOT, OPENAPI)}`,
  `操作总数(含多方法路径): ${items.length}`,
  `COVERED(已被手写代理覆盖): ${coveredItems.length}`,
  `NEW(尚未代理 / 需新建骨架): ${newItems.length}`,
  `写入模式: ${DO_WRITE ? 'WRITE(仅新建)' : 'DRY-RUN(仅草稿)'}`,
  '',
  '## NEW — 以下 openapi 操作尚未被任何手写 route.ts 代理，已产出骨架',
  '',
  ...newItems.map(
    (it) =>
      `- [${Object.keys(it.present).map((m) => m.toUpperCase()).join(',')}] ${it.apiPath}  ->  src/app/api/${it.dir}/route.ts`,
  ),
  '',
  '## COVERED — 以下 openapi 操作已被手写 route.ts 代理（含 comments↔replies / posts↔topics 目录重映射），不产出骨架',
  '',
  ...coveredItems.map((it) => `- [${Object.keys(it.present).map((m) => m.toUpperCase()).join(',')}] ${it.apiPath}  (匹配代理归一路径: ${it.coveredBy})`),
  '',
  '## TS 语法校验',
  '',
  checkReport.attempted
    ? (checkReport.skipped
        ? `跳过（typescript 不可用: ${checkReport.skipped}）`
        : `通过 ${checkReport.ok} / 失败 ${checkReport.fail}` + (checkReport.errors.length ? '\n' + JSON.stringify(checkReport.errors, null, 2) : ''))
    : '未执行',
  '',
].join('\n');
writeFileSync(join(OUT_DIR, 'RECONCILE.md'), reconcile);

// 控制台摘要
console.log('=== bff-routes 生成器 ===');
console.log('OpenAPI 操作数:', items.length);
console.log('COVERED:', coveredItems.length, ' NEW:', newItems.length);
console.log('模式:', DO_WRITE ? 'WRITE(仅新建)' : 'DRY-RUN → ' + relative(FRONTEND_ROOT, OUT_DIR));
if (checkReport.attempted && !checkReport.skipped) {
  console.log('TS 语法校验: 通过', checkReport.ok, '/ 失败', checkReport.fail);
}
console.log('详见:', join(OUT_DIR, 'RECONCILE.md'));
