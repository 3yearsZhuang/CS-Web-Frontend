#!/usr/bin/env node
/**
 * @file SQLite → PostgreSQL 数据迁移脚本（迁移计划 Phase 6）
 *
 * 功能：将旧前端单体库 CS-Web-Frontend/data/app.db（SQLite）的业务数据
 *       迁移到后端 PostgreSQL（默认库 domefff）。
 *
 * 核心难点处理：
 *   1. 主键体系不同：SQLite 为 TEXT/UUID 主键，PG 为 Integer 自增。
 *      迁移时建立「UUID → Integer」映射表，按外键依赖序逐层导入。
 *   2. 认证字段差异：SQLite users.role 单列 → PG user_roles 多对多；
 *      root 角色映射为 is_superuser=true；username 由 display_name/email 派生。
 *   3. 类型转换：Integer 布尔 0/1 → boolean；ISO 日期 → timestamptz；JSON 文本 → jsonb。
 *   4. 幂等：按 email/username 去重，已存在则跳过；可安全重跑。
 *   5. 收尾：同步 PG 各表自增序列（setval）。
 *
 * 用法：
 *   PGHOST=localhost PGPORT=5432 PGDATABASE=domefff PGUSER=postgres PGPASSWORD=xxx \
 *   node tools/scripts/migrate-sqlite-to-pg.mjs
 *
 * 环境变量：
 *   - SQLITE_DB_PATH   SQLite 文件路径（默认 ../data/app.db 相对脚本）
 *   - PG*              PostgreSQL 连接参数
 *   - DRY_RUN=1        只打印计划、不写库
 *   - RESET=1          迁移前清空全部业务表（保留 roles/users 种子）后重导，
 *                      保证重复执行结果一致（幂等）。推荐在非空/中断场景下使用。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import postgres from 'postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DRY_RUN = process.env.DRY_RUN === '1';

// ---------------------------------------------------------------------------
// 1. 连接
// ---------------------------------------------------------------------------
const sqlitePath =
  process.env.SQLITE_DB_PATH ??
  path.resolve(__dirname, '..', '..', 'data', 'app.db');

if (!fs.existsSync(sqlitePath)) {
  console.error(`[x] SQLite 数据库不存在: ${sqlitePath}`);
  process.exit(1);
}

const sqlite = new Database(sqlitePath, { readonly: true });
const pg = postgres({
  host: process.env.PGHOST ?? 'localhost',
  port: Number(process.env.PGPORT ?? 5432),
  database: process.env.PGDATABASE ?? 'domefff',
  username: process.env.PGUSER ?? 'postgres',
  password: process.env.PGPASSWORD ?? '',
  max: 5,
  onnotice: () => {},
});

// ---------------------------------------------------------------------------
// 2. 工具函数
// ---------------------------------------------------------------------------
const log = (...a) => console.log(...a);
const warn = (...a) => console.warn('[!]', ...a);

/** UUID → Integer 映射表 */
const idMap = new Map();

/** 注册映射 */
function registerMap(table, uuid, intId) {
  if (uuid === null || uuid === undefined) return;
  const key = `${table}:${uuid}`;
  if (idMap.has(key) && idMap.get(key) !== intId) {
    warn(`主键冲突 ${key}: ${idMap.get(key)} vs ${intId}`);
  }
  idMap.set(key, intId);
}

/** 取映射后的 Integer，找不到返回 null */
function mapId(table, uuid) {
  if (uuid === null || uuid === undefined || uuid === '') return null;
  const v = idMap.get(`${table}:${uuid}`);
  if (v === undefined) {
    warn(`缺失映射 ${table}:${uuid}，置为 null`);
    return null;
  }
  return v;
}

/** 布尔转换：SQLite 0/1/null → boolean/null */
function toBool(v) {
  if (v === null || v === undefined) return null;
  return v === 1 || v === true || v === '1' || v === 'true' || v === 't';
}

/** 时间转换：ISO/`YYYY-MM-DD HH:MM:SS` → Date 或 null */
function toDate(v) {
  if (v === null || v === undefined || v === '') return null;
  // SQLite datetime('now') 格式 "YYYY-MM-DD HH:MM:SS" → 补 T + Z
  let s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) s = s.replace(' ', 'T') + 'Z';
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** JSON 文本 → 值（PG jsonb 用） */
function toJson(v, fallback = null) {
  if (v === null || v === undefined || v === '') return fallback;
  try {
    return JSON.parse(v);
  } catch {
    warn(`JSON 解析失败: ${String(v).slice(0, 50)}`);
    return fallback;
  }
}

/** 从 email/display_name 派生 username（PG 唯一非空） */
function deriveUsername(email, displayName, usedSet) {
  let base = 'user';
  if (email) base = email.split('@')[0];
  else if (displayName) base = displayName;
  // 去非法字符、截断
  base = base.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/^[\d_.-]+/, '').slice(0, 40);
  if (!base) base = 'user';
  // 去重
  let uname = base;
  let i = 1;
  while (usedSet.has(uname)) uname = `${base}_${i++}`;
  usedSet.add(uname);
  return uname;
}

// ---------------------------------------------------------------------------
// 3. 取数
// ---------------------------------------------------------------------------
const all = (table) => sqlite.prepare(`SELECT * FROM "${table}"`).all();

// ---------------------------------------------------------------------------
// 4. 角色映射：SQLite 单列 role → PG 角色 id
// ---------------------------------------------------------------------------
async function loadPgRoles() {
  const roles = await pg`SELECT id, name FROM roles`;
  const roleMap = new Map();
  for (const r of roles) roleMap.set(r.name, r.id);
  return roleMap;
}

// ---------------------------------------------------------------------------
// 5. 主流程
// ---------------------------------------------------------------------------
async function main() {
  if (DRY_RUN) log('=== DRY RUN（不写库）===');
  log(`SQLite 源: ${sqlitePath}`);
  log('');

  const pgRoles = await loadPgRoles();
  log(`PG 角色: ${[...pgRoles.entries()].map(([n, id]) => `${n}(${id})`).join(', ')}`);
  const existingUsernames = new Set(
    (await pg`SELECT username FROM users`).map((u) => u.username),
  );
  const existingEmails = new Set(
    (await pg`SELECT email FROM users`).map((u) => u.email),
  );
  log(`PG 已有用户: ${existingEmails.size} 个\n`);

  // ---------- RESET：清空业务表（保留 users/roles 种子）保证幂等 ----------
  if (!DRY_RUN && process.env.RESET === '1') {
    log('--- RESET：清空业务表 ---');
    // 仅包含 PG 中确实存在的业务表（login_history/sessions 未迁移到 PG，不列入）
    const resetTables = [
      'two_factor_auth',
      'password_reset_requests',
      'verification_codes',
      'event_checkins',
      'event_registrations',
      'community_comments',
      'community_posts',
      'community_categories',
      'component_registry_variants',
      'component_registry_guides',
      'component_registry_items',
      'points_transactions',
      'task_claims',
      'tasks',
      'exam_question_options',
      'exam_questions',
      'exams',
      'resources',
      'notifications',
      'join_applications',
      'announcements',
      'settings',
      'blog_series',
    ];
    // 先删有外键依赖的子表，再删主表
    await pg.unsafe(
      `TRUNCATE TABLE ${resetTables.join(', ')} RESTART IDENTITY CASCADE`,
    );
    log(`  已清空: ${resetTables.length} 张业务表\n`);
    // 重建映射缓存（旧映射来自已清空的表，需重置）
    for (const k of [...idMap.keys()]) {
      if (!k.startsWith('users:')) idMap.delete(k);
    }
  }

  // 需要连通的角色映射
  const USER_ROLE = pgRoles.get('user');
  const ADMIN_ROLE = pgRoles.get('admin');

  // ---------- 5.1 users ----------
  log('--- [1/9] users ---');
  const srcUsers = all('users');
  let usersImported = 0;
  const userUuidMap = new Map(); // uuid -> newId

  for (const u of srcUsers) {
    if (existingEmails.has(u.email)) {
      // 已存在：登记其 PG id 映射（保证后续外键能正确关联），并补登 user_roles
      if (!DRY_RUN) {
        const [ex] = await pg`SELECT id FROM users WHERE email = ${u.email}`;
        if (ex) {
          userUuidMap.set(u.id, ex.id);
          registerMap('users', u.id, ex.id);
          const roleId =
            u.role === 'root' || u.role === 'admin' ? ADMIN_ROLE : USER_ROLE;
          if (roleId) {
            const [link] = await pg`
              SELECT 1 FROM user_roles WHERE user_id = ${ex.id} AND role_id = ${roleId}
            `;
            if (!link) await pg`INSERT INTO user_roles (user_id, role_id) VALUES (${ex.id}, ${roleId})`;
          }
        }
      }
      log(`  跳过已存在用户: ${u.email}`);
      continue;
    }
    const isSuperuser = u.role === 'root';
    const username = deriveUsername(u.email, u.display_name, existingUsernames);
    const row = {
      username,
      email: u.email,
      hashed_password: u.password_hash,
      full_name: u.full_name ?? null,
      is_active: toBool(u.is_active) ?? true,
      is_superuser: isSuperuser,
      created_at: toDate(u.created_at),
      updated_at: toDate(u.updated_at),
      password_changed_at: null,
      deleted_at: null,
      display_name: u.display_name ?? null,
      bio: u.bio ?? null,
      avatar_url: u.avatar_url ?? null,
      avatar_type: u.avatar_type ?? 'initial',
      github_url: u.github_url ?? null,
      website_url: u.website_url ?? null,
      github_id: u.github_id ?? null,
      tech_tags: toJson(u.tech_tags, []),
    };
    if (!DRY_RUN) {
      const [ins] = await pg`
        INSERT INTO users ${pg(row)}
        RETURNING id
      `;
      userUuidMap.set(u.id, ins.id);
      registerMap('users', u.id, ins.id);

      // 角色映射：user/admin → user_roles；root 已是 superuser，也挂 admin
      const roleId =
        u.role === 'root' ? ADMIN_ROLE : u.role === 'admin' ? ADMIN_ROLE : USER_ROLE;
      if (roleId) {
        await pg`INSERT INTO user_roles (user_id, role_id) VALUES (${ins.id}, ${roleId})`;
      }
    } else {
      userUuidMap.set(u.id, -1);
    }
    usersImported++;
    log(`  导入用户: ${u.email} (role=${u.role}, super=${isSuperuser}, username=${username})`);
  }
  log(`  users: 新增 ${usersImported} 个\n`);

  // ---------- 5.2 community_categories ----------
  log('--- [2/9] community_categories ---');
  let n = 0;
  for (const c of all('community_categories')) {
    const row = {
      slug: c.slug,
      name: c.name,
      description: c.description ?? null,
      icon: c.icon ?? null,
      sort_order: c.sort_order ?? 0,
      post_count: c.post_count ?? 0,
      created_by: mapId('users', c.created_by),
      created_at: toDate(c.created_at),
      updated_at: toDate(c.updated_at),
    };
    if (!DRY_RUN) {
      const [ins] = await pg`INSERT INTO community_categories ${pg(row)} RETURNING id`;
      registerMap('community_categories', c.id, ins.id);
    }
    n++;
  }
  log(`  community_categories: ${n} 条\n`);

  // ---------- 5.3 community_posts ----------
  log('--- [3/9] community_posts ---');
  n = 0;
  for (const p of all('community_posts')) {
    const row = {
      kind: p.kind,
      category_id: mapId('community_categories', p.category_id),
      author_id: mapId('users', p.author_id),
      title: p.title,
      // 旧前端论坛图 URL /api/forum/images/ 对齐后端 /api/community/forum/images/
      content_markdown: (p.content_markdown ?? '').replace(
        /\/api\/forum\/images\//g,
        '/api/community/forum/images/',
      ),
      status: p.status ?? 'published',
      is_pinned: toBool(p.is_pinned) ?? false,
      is_featured: toBool(p.is_featured) ?? false,
      reply_count: p.reply_count ?? 0,
      favorite_count: p.favorite_count ?? 0,
      last_reply_at: toDate(p.last_reply_at),
      last_reply_id: mapId('community_posts', p.last_reply_id),
      hidden_by: mapId('users', p.hidden_by),
      hidden_at: toDate(p.hidden_at),
      hidden_reason: p.hidden_reason ?? null,
      slug: p.slug ?? null,
      excerpt: p.excerpt ?? null,
      cover_image: p.cover_image ?? null,
      tags: toJson(p.tags, []),
      series_id: null,
      series_order: p.series_order ?? 0,
      published_at: toDate(p.published_at),
      view_count: p.view_count ?? 0,
      like_count: p.like_count ?? 0,
      created_at: toDate(p.created_at),
      updated_at: toDate(p.updated_at),
    };
    if (!DRY_RUN) {
      const [ins] = await pg`INSERT INTO community_posts ${pg(row)} RETURNING id`;
      registerMap('community_posts', p.id, ins.id);
    }
    n++;
  }
  log(`  community_posts: ${n} 条\n`);

  // ---------- 5.4 community_comments ----------
  log('--- [4/9] community_comments ---');
  n = 0;
  for (const c of all('community_comments')) {
    const row = {
      post_id: mapId('community_posts', c.post_id),
      author_id: mapId('users', c.author_id),
      parent_comment_id: mapId('community_comments', c.parent_comment_id),
      content_markdown: c.content_markdown,
      status: c.status ?? 'published',
      like_count: c.like_count ?? 0,
      reply_count: c.reply_count ?? 0,
      hidden_by: mapId('users', c.hidden_by),
      hidden_at: toDate(c.hidden_at),
      hidden_reason: c.hidden_reason ?? null,
      created_at: toDate(c.created_at),
      updated_at: toDate(c.updated_at),
    };
    if (!DRY_RUN) {
      const [ins] = await pg`INSERT INTO community_comments ${pg(row)} RETURNING id`;
      registerMap('community_comments', c.id, ins.id);
    }
    n++;
  }
  log(`  community_comments: ${n} 条\n`);

  // ---------- 5.5 events + registrations ----------
  log('--- [5/9] events / event_registrations ---');
  n = 0;
  for (const e of all('events')) {
    const row = {
      month: e.month ?? null,
      date: e.date ?? null,
      title: e.title,
      description: e.description ?? null,
      status: e.status ?? null,
      year: e.year ?? null,
      topics: toJson(e.topics, []),
      tags: toJson(e.tags, []),
      is_pinned: toBool(e.is_pinned) ?? false,
      capacity: e.capacity ?? 0,
      content_markdown: e.content_markdown ?? null,
      created_by: mapId('users', e.created_by),
      // API EventOut 要求列表字段为 []（非 null），否则响应校验失败
      registration_fields: toJson(e.registration_fields, []),
      created_at: toDate(e.created_at),
      updated_at: toDate(e.updated_at),
    };
    if (!DRY_RUN) {
      const [ins] = await pg`INSERT INTO events ${pg(row)} RETURNING id`;
      registerMap('events', e.id, ins.id);
    }
    n++;
  }
  log(`  events: ${n} 条`);

  // event_registrations（依赖 events + users）
  let regN = 0;
  for (const r of all('event_registrations')) {
    const row = {
      user_id: mapId('users', r.user_id),
      event_id: mapId('events', r.event_id),
      status: r.status ?? 'registered',
      registered_at: toDate(r.registered_at),
      cancelled_at: toDate(r.cancelled_at),
      form_data: toJson(r.form_data, null),
    };
    if (!DRY_RUN && row.user_id && row.event_id) {
      await pg`INSERT INTO event_registrations ${pg(row)}`;
    }
    regN++;
  }
  log(`  event_registrations: ${regN} 条（跳过缺失外键）\n`);

  // ---------- 5.6 exams / questions / options ----------
  log('--- [6/9] exams / exam_questions / exam_question_options ---');
  n = 0;
  for (const e of all('exams')) {
    const row = {
      title: e.title,
      description: e.description ?? null,
      status: e.status ?? 'draft',
      start_time: toDate(e.start_time),
      end_time: toDate(e.end_time),
      duration_minutes: e.duration_minutes ?? null,
      tech_tags: toJson(e.tech_tags, null),
      created_by: mapId('users', e.created_by),
      created_at: toDate(e.created_at),
      updated_at: toDate(e.updated_at),
    };
    if (!DRY_RUN) {
      const [ins] = await pg`INSERT INTO exams ${pg(row)} RETURNING id`;
      registerMap('exams', e.id, ins.id);
    }
    n++;
  }
  log(`  exams: ${n} 条`);

  n = 0;
  for (const q of all('exam_questions')) {
    const row = {
      exam_id: mapId('exams', q.exam_id),
      type: q.type ?? 'single_choice',
      title: q.title,
      content_markdown: q.content_markdown ?? null,
      score: q.score ?? 5,
      sort_order: q.sort_order ?? 0,
      created_at: toDate(q.created_at),
    };
    if (!DRY_RUN) {
      const [ins] = await pg`INSERT INTO exam_questions ${pg(row)} RETURNING id`;
      registerMap('exam_questions', q.id, ins.id);
    }
    n++;
  }
  log(`  exam_questions: ${n} 条`);

  n = 0;
  for (const o of all('exam_question_options')) {
    const row = {
      question_id: mapId('exam_questions', o.question_id),
      label: o.label,
      content: o.content,
      is_correct: toBool(o.is_correct) ?? false,
      sort_order: o.sort_order ?? 0,
    };
    if (!DRY_RUN && row.question_id) {
      await pg`INSERT INTO exam_question_options ${pg(row)}`;
    }
    n++;
  }
  log(`  exam_question_options: ${n} 条\n`);

  // ---------- 5.7 resources ----------
  log('--- [7/9] resources ---');
  n = 0;
  for (const r of all('resources')) {
    const row = {
      title: r.title,
      url: r.url,
      description: r.description ?? null,
      resource_type: r.resource_type ?? 'article',
      tech_tags: toJson(r.tech_tags, null),
      status: r.status ?? 'draft',
      submitted_by: mapId('users', r.submitted_by),
      reviewed_by: mapId('users', r.reviewed_by),
      review_note: r.review_note ?? null,
      file_url: r.file_url ?? null,
      view_count: r.view_count ?? 0,
      like_count: r.like_count ?? 0,
      created_at: toDate(r.created_at),
      updated_at: toDate(r.updated_at),
    };
    if (!DRY_RUN && row.submitted_by) {
      const [ins] = await pg`INSERT INTO resources ${pg(row)} RETURNING id`;
      registerMap('resources', r.id, ins.id);
    }
    n++;
  }
  log(`  resources: ${n} 条\n`);

  // ---------- 5.8 component_registry ----------
  // 注意：SQLite component_registry_items 的 id 是 `cmp-button` 形式的字符串，
  //       variants/guides 的 item_id 引用的是这个 id（非 slug）。先导 items，
  //       再按「SQLite item id」回填 variant/guide 的 item_id。
  log('--- [8/9] component_registry ---');
  const itemIdMap = new Map(); // SQLite item.id (如 cmp-button) -> newId
  n = 0;
  for (const it of all('component_registry_items')) {
    const row = {
      name: it.name,
      slug: it.slug,
      category: it.category ?? 'general',
      description: it.description ?? null,
      migration_status: it.migration_status ?? 'legacy',
      sort_order: it.sort_order ?? 0,
      created_at: toDate(it.created_at),
      updated_at: toDate(it.updated_at),
    };
    if (!DRY_RUN) {
      // 若 slug 已存在（幂等），复用其 id
      const exists = await pg`SELECT id FROM component_registry_items WHERE slug = ${it.slug}`;
      let itemId;
      if (exists.length > 0) {
        itemId = exists[0].id;
      } else {
        const [ins] = await pg`INSERT INTO component_registry_items ${pg(row)} RETURNING id`;
        itemId = ins.id;
      }
      registerMap('component_registry_items', it.id, itemId);
      itemIdMap.set(it.id, itemId);
    } else {
      itemIdMap.set(it.id, -1);
    }
    n++;
  }
  log(`  component_registry_items: ${n} 条`);

  // variants（item_id 通过 SQLite item.id 回填）
  n = 0;
  for (const v of all('component_registry_variants')) {
    const itemId = itemIdMap.get(v.item_id);
    if (!itemId) {
      warn(`跳过 variant，item 不存在: ${v.item_id}`);
      continue;
    }
    const row = {
      item_id: itemId,
      size: v.size,
      color: v.color,
      state: v.state,
      is_enabled: toBool(v.is_enabled) ?? true,
    };
    if (!DRY_RUN) {
      // 幂等：唯一约束 (item_id,size,color,state)
      const exists = await pg`
        SELECT id FROM component_registry_variants
        WHERE item_id = ${itemId} AND size = ${v.size} AND color = ${v.color} AND state = ${v.state}
      `;
      if (exists.length === 0) {
        await pg`INSERT INTO component_registry_variants ${pg(row)}`;
      }
    }
    n++;
  }
  log(`  component_registry_variants: ${n} 条（去重幂等）`);

  // guides（item_id 通过 SQLite item.id 回填）
  n = 0;
  for (const g of all('component_registry_guides')) {
    const itemId = itemIdMap.get(g.item_id);
    if (!itemId) {
      warn(`跳过 guide，item 不存在: ${g.item_id}`);
      continue;
    }
    const row = {
      item_id: itemId,
      use_cases: toJson(g.use_cases, []),
      anti_patterns: toJson(g.anti_patterns, []),
      updated_at: toDate(g.updated_at),
    };
    if (!DRY_RUN) {
      const exists = await pg`SELECT id FROM component_registry_guides WHERE item_id = ${itemId}`;
      if (exists.length === 0) {
        await pg`INSERT INTO component_registry_guides ${pg(row)}`;
      }
    }
    n++;
  }
  log(`  component_registry_guides: ${n} 条\n`);

  // ---------- 5.9 其余业务表（通知/入社/公告/任务/积分/settings/2FA） ----------
  log('--- [9/9] notifications / join / announcements / tasks / points / settings ---');
  n = 0;
  for (const note of all('notifications')) {
    const row = {
      user_id: mapId('users', note.user_id),
      type: note.type,
      title: note.title,
      content: note.content ?? null,
      is_read: toBool(note.is_read) ?? false,
      sender_id: mapId('users', note.sender_id),
      created_at: toDate(note.created_at),
    };
    if (!DRY_RUN && row.user_id) {
      await pg`INSERT INTO notifications ${pg(row)}`;
    }
    n++;
  }
  log(`  notifications: ${n} 条`);

  n = 0;
  for (const j of all('join_applications')) {
    const row = {
      applicant_name: j.applicant_name,
      student_id: j.student_id,
      major: j.major,
      tech_tags: toJson(j.tech_tags, null),
      reason: j.reason,
      contact_qq: j.contact_qq ?? null,
      contact_phone: j.contact_phone ?? null,
      user_id: mapId('users', j.user_id),
      status: j.status ?? 'pending',
      reviewed_by: mapId('users', j.reviewed_by),
      review_note: j.review_note ?? null,
      created_at: toDate(j.created_at),
      updated_at: toDate(j.updated_at),
    };
    if (!DRY_RUN) {
      await pg`INSERT INTO join_applications ${pg(row)}`;
    }
    n++;
  }
  log(`  join_applications: ${n} 条`);

  n = 0;
  for (const a of all('announcements')) {
    const row = {
      title: a.title,
      content: a.content ?? null,
      level: a.level ?? 'info',
      is_active: toBool(a.is_active) ?? true,
      is_dismissible: toBool(a.is_dismissible) ?? true,
      priority: a.priority ?? 0,
      expires_at: toDate(a.expires_at),
      target_roles: toJson(a.target_roles, null),
      created_by: mapId('users', a.created_by),
      created_at: toDate(a.created_at),
      updated_at: toDate(a.updated_at),
    };
    if (!DRY_RUN && row.created_by) {
      await pg`INSERT INTO announcements ${pg(row)}`;
    }
    n++;
  }
  log(`  announcements: ${n} 条`);

  n = 0;
  for (const t of all('tasks')) {
    const row = {
      title: t.title,
      description: t.description ?? '',
      content_markdown: t.content_markdown ?? null,
      category: t.category ?? 'general',
      tags: toJson(t.tags, []),
      points: t.points ?? 0,
      max_claimants: t.max_claimants ?? 1,
      status: t.status ?? 'draft',
      created_by: mapId('users', t.created_by),
      published_at: toDate(t.published_at),
      closed_at: toDate(t.closed_at),
      created_at: toDate(t.created_at),
      updated_at: toDate(t.updated_at),
    };
    if (!DRY_RUN && row.created_by) {
      const [ins] = await pg`INSERT INTO tasks ${pg(row)} RETURNING id`;
      registerMap('tasks', t.id, ins.id);
    }
    n++;
  }
  log(`  tasks: ${n} 条`);

  n = 0;
  for (const tc of all('task_claims')) {
    const row = {
      task_id: mapId('tasks', tc.task_id),
      user_id: mapId('users', tc.user_id),
      status: tc.status ?? 'claimed',
      claim_note: tc.claim_note ?? null,
      completed_at: toDate(tc.completed_at),
      reviewed_by: mapId('users', tc.reviewed_by),
      review_note: tc.review_note ?? null,
      created_at: toDate(tc.created_at),
    };
    if (!DRY_RUN && row.task_id && row.user_id) {
      await pg`INSERT INTO task_claims ${pg(row)}`;
    }
    n++;
  }
  log(`  task_claims: ${n} 条`);

  n = 0;
  for (const pt of all('points_transactions')) {
    const row = {
      user_id: mapId('users', pt.user_id),
      amount: pt.amount ?? 0,
      reason: pt.reason,
      source_type: pt.source_type ?? 'system',
      source_id: null,
      balance_after: pt.balance_after ?? 0,
      created_at: toDate(pt.created_at),
    };
    if (!DRY_RUN && row.user_id) {
      await pg`INSERT INTO points_transactions ${pg(row)}`;
    }
    n++;
  }
  log(`  points_transactions: ${n} 条`);

  n = 0;
  for (const s of all('settings')) {
    const row = {
      module: s.module,
      key: s.key,
      value: s.value,
      updated_at: toDate(s.updated_at),
    };
    if (!DRY_RUN) {
      await pg`INSERT INTO settings ${pg(row)} ON CONFLICT (module, key) DO NOTHING`;
    }
    n++;
  }
  log(`  settings: ${n} 条`);

  n = 0;
  for (const t of all('two_factor_auth')) {
    const row = {
      user_id: mapId('users', t.user_id),
      secret_encrypted: t.secret_encrypted,
      backup_codes: toJson(t.backup_codes, []),
      enabled: toBool(t.enabled) ?? false,
      enabled_at: toDate(t.enabled_at),
      created_at: toDate(t.created_at),
      updated_at: toDate(t.updated_at),
    };
    if (!DRY_RUN && row.user_id) {
      await pg`INSERT INTO two_factor_auth ${pg(row)}`;
    }
    n++;
  }
  log(`  two_factor_auth: ${n} 条\n`);

  // ---------- 5.10 序列同步 ----------
  if (!DRY_RUN) {
    log('--- 序列同步 (setval) ---');
    const tables = [
      'users',
      'community_categories',
      'community_posts',
      'community_comments',
      'events',
      'event_registrations',
      'event_checkins',
      'exams',
      'exam_questions',
      'exam_question_options',
      'resources',
      'component_registry_items',
      'component_registry_variants',
      'component_registry_guides',
      'notifications',
      'join_applications',
      'announcements',
      'tasks',
      'task_claims',
      'points_transactions',
      'settings',
      'password_reset_requests',
      'verification_codes',
      'blog_series',
    ];
    for (const t of tables) {
      try {
        // 表名/列名动态拼接需用 unsafe，值本身来自固定白名单（tables 数组），无注入风险
        await pg.unsafe(
          `SELECT setval(pg_get_serial_sequence('${t}', 'id'),
                 COALESCE((SELECT MAX(id) FROM "${t}"), 1))`,
        );
        log(`  ${t} 序列已同步`);
      } catch (e) {
        warn(`  ${t} 序列同步失败: ${e.message}`);
      }
    }
  }

  log('\n=== 迁移完成 ===');
  if (DRY_RUN) {
    log('（DRY RUN 模式，未写入任何数据）');
  }
}

main()
  .then(() => {
    sqlite.close();
    pg.end();
    process.exit(0);
  })
  .catch((e) => {
    console.error('\n[x] 迁移失败:', e);
    sqlite.close();
    pg.end();
    process.exit(1);
  });
