/**
 * @file 资源模块单元测试
 *
 * 覆盖核心服务层逻辑：
 *   - CRUD：createResource / updateResource / deleteResource / getResourceById / getUserResources
 *   - 状态机：draft（默认）→ published/hidden（审核）；编辑后强制回退 draft
 *   - IDOR 防护：updateResource / deleteResource 所有权校验
 *   - 审核：reviewResource 仅 draft 可审核 / published 与 hidden 流转 / 重复审核拦截
 *   - 列表：listResources 默认只返回 published / 按类型与标签筛选 / popular 排序
 *   - 待审列表：listPendingResources 固定查 draft / 按提交时间升序
 *   - 文件安全：readResourceFile 路径遍历防护 / 文件名格式校验
 *
 * 测试策略：内存 SQLite + vi.mock 替换 getDb / logAdminAction / node:fs
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';

const inMemoryDb = new Database(':memory:');

vi.mock('@/shared/db', () => ({
  getDb: () => inMemoryDb,
  __esModule: true,
}));

vi.mock('@/shared/security/audit', () => ({
  logAdminAction: vi.fn(),
  __esModule: true,
}));

const fsMocks = vi.hoisted(() => ({
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
  readFileSync: vi.fn(() => Buffer.from('file-content')),
}));

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  const mocked = {
    ...actual,
    existsSync: fsMocks.existsSync,
    mkdirSync: fsMocks.mkdirSync,
    writeFileSync: fsMocks.writeFileSync,
    readFileSync: fsMocks.readFileSync,
  };
  return { ...mocked, default: mocked };
});

import {
  createResource,
  updateResource,
  deleteResource,
  getResourceById,
  getUserResources,
  listResources,
  reviewResource,
  incrementResourceView,
  listPendingResources,
  saveResourceFile,
  readResourceFile,
  RESOURCE_TYPE_LABELS,
} from '@/modules/tools/server/resource';
import { logAdminAction } from '@/shared/security/audit';

const USER_ID = 'user-001';
const USER_ID_2 = 'user-002';
const ADMIN_ID = 'admin-001';

function initTestSchema() {
  inMemoryDb.exec(`
    CREATE TABLE IF NOT EXISTS resources (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL,
      description TEXT,
      resource_type TEXT NOT NULL DEFAULT 'article',
      tech_tags TEXT,
      file_url TEXT,
      status TEXT NOT NULL DEFAULT 'draft',
      submitted_by TEXT NOT NULL,
      reviewed_by TEXT,
      review_note TEXT,
      view_count INTEGER NOT NULL DEFAULT 0,
      like_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT,
      avatar_url TEXT,
      tech_tags TEXT,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function clearTables() {
  inMemoryDb.exec('DELETE FROM resources');
  inMemoryDb.exec('DELETE FROM users');
}

function seedUser(id: string, email: string, displayName: string | null = null) {
  inMemoryDb
    .prepare('INSERT INTO users (id, email, display_name, password_hash) VALUES (?, ?, ?, ?)')
    .run(id, email, displayName, 'dummy-hash');
}

function makeValidInput(overrides: Record<string, unknown> = {}) {
  return {
    title: 'React 入门指南',
    url: 'https://react.dev/learn',
    description: '一份优秀的 React 入门教程',
    resourceType: 'article' as const,
    techTags: ['react', 'frontend'],
    ...overrides,
  };
}

describe('resource 模块 — CRUD 服务', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
    seedUser(USER_ID, 'u1@test.com', '用户一');
    seedUser(ADMIN_ID, 'admin@test.com', '管理员');
    vi.mocked(logAdminAction).mockClear();
  });

  describe('createResource', () => {
    it('创建成功并返回完整 Resource，初始状态为 draft', () => {
      const result = createResource(USER_ID, makeValidInput());
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.resource.id).toBeDefined();
      expect(result.resource.title).toBe('React 入门指南');
      expect(result.resource.url).toBe('https://react.dev/learn');
      expect(result.resource.status).toBe('draft');
      expect(result.resource.resource_type).toBe('article');
      expect(result.resource.submitted_by).toBe(USER_ID);
    });

    it('标题为空时返回错误', () => {
      const result = createResource(USER_ID, makeValidInput({ title: '' }));
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe('标题和链接不能为空');
    });

    it('链接为空时返回错误', () => {
      const result = createResource(USER_ID, makeValidInput({ url: '' }));
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe('标题和链接不能为空');
    });

    it('未指定 resourceType 时默认 article', () => {
      const result = createResource(USER_ID, makeValidInput({ resourceType: undefined }));
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.resource.resource_type).toBe('article');
    });

    it('techTags 序列化为 JSON 存储', () => {
      const result = createResource(USER_ID, makeValidInput({ techTags: ['a', 'b'] }));
      expect(result.ok).toBe(true);
      const row = inMemoryDb.prepare('SELECT tech_tags FROM resources WHERE id = ?').get(
        (result as { resource: { id: string } }).resource.id,
      ) as { tech_tags: string };
      expect(JSON.parse(row.tech_tags)).toEqual(['a', 'b']);
    });

    it('无 techTags 时存储为 null', () => {
      const result = createResource(USER_ID, makeValidInput({ techTags: undefined }));
      expect(result.ok).toBe(true);
      const row = inMemoryDb.prepare('SELECT tech_tags FROM resources WHERE id = ?').get(
        (result as { resource: { id: string } }).resource.id,
      ) as { tech_tags: string | null };
      expect(row.tech_tags).toBeNull();
    });
  });

  describe('getResourceById', () => {
    it('存在的 ID 返回资源', () => {
      const created = createResource(USER_ID, makeValidInput());
      const fetched = getResourceById((created as { resource: { id: string } }).resource.id);
      expect(fetched).not.toBeNull();
      expect(fetched!.title).toBe('React 入门指南');
    });

    it('不存在的 ID 返回 null', () => {
      expect(getResourceById('non-existent')).toBeNull();
    });
  });

  describe('getUserResources', () => {
    it('返回用户提交的所有资源', () => {
      createResource(USER_ID, makeValidInput({ title: 'R1' }));
      createResource(USER_ID, makeValidInput({ title: 'R2' }));
      const list = getUserResources(USER_ID);
      expect(list).toHaveLength(2);
    });

    it('按状态筛选', () => {
      const r1 = createResource(USER_ID, makeValidInput({ title: 'R1' }));
      reviewResource((r1 as { resource: { id: string } }).resource.id, ADMIN_ID, { status: 'published' });
      createResource(USER_ID, makeValidInput({ title: 'R2' }));
      const draftList = getUserResources(USER_ID, 'draft');
      expect(draftList).toHaveLength(1);
      expect(draftList[0].title).toBe('R2');
    });
  });
});

describe('resource 模块 — 状态机', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
    seedUser(USER_ID, 'u1@test.com', '用户一');
    seedUser(ADMIN_ID, 'admin@test.com', '管理员');
    vi.mocked(logAdminAction).mockClear();
  });

  describe('reviewResource — draft → published/hidden', () => {
    it('审核通过 published', () => {
      const created = createResource(USER_ID, makeValidInput());
      const result = reviewResource(
        (created as { resource: { id: string } }).resource.id,
        ADMIN_ID,
        { status: 'published' },
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.resource.status).toBe('published');
      expect(result.resource.reviewed_by).toBe(ADMIN_ID);
    });

    it('审核拒绝 hidden', () => {
      const created = createResource(USER_ID, makeValidInput());
      const result = reviewResource(
        (created as { resource: { id: string } }).resource.id,
        ADMIN_ID,
        { status: 'hidden' },
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.resource.status).toBe('hidden');
    });

    it('已发布资源不可再审核', () => {
      const created = createResource(USER_ID, makeValidInput());
      const id = (created as { resource: { id: string } }).resource.id;
      reviewResource(id, ADMIN_ID, { status: 'published' });
      const result = reviewResource(id, ADMIN_ID, { status: 'hidden' });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe('该资源已审核');
    });

    it('已隐藏资源不可再审核', () => {
      const created = createResource(USER_ID, makeValidInput());
      const id = (created as { resource: { id: string } }).resource.id;
      reviewResource(id, ADMIN_ID, { status: 'hidden' });
      const result = reviewResource(id, ADMIN_ID, { status: 'published' });
      expect(result.ok).toBe(false);
    });

    it('不存在的资源返回错误', () => {
      const result = reviewResource('non-existent', ADMIN_ID, { status: 'published' });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe('资源不存在');
    });

    it('审核时记录审计日志', () => {
      const created = createResource(USER_ID, makeValidInput());
      reviewResource(
        (created as { resource: { id: string } }).resource.id,
        ADMIN_ID,
        { status: 'published', note: '内容优质' },
        '127.0.0.1',
        'UA',
      );
      expect(logAdminAction).toHaveBeenCalledTimes(1);
      const [actorId, action, targetUserId, details, ip, ua] = vi.mocked(logAdminAction).mock.calls[0];
      expect(actorId).toBe(ADMIN_ID);
      expect(action).toBe('approve_resource');
      expect(targetUserId).toBe(USER_ID);
      expect((details as { note: string }).note).toBe('内容优质');
      expect(ip).toBe('127.0.0.1');
      expect(ua).toBe('UA');
    });

    it('隐藏时审计 action 为 hide_resource', () => {
      const created = createResource(USER_ID, makeValidInput());
      reviewResource(
        (created as { resource: { id: string } }).resource.id,
        ADMIN_ID,
        { status: 'hidden' },
      );
      expect(vi.mocked(logAdminAction).mock.calls[0][1]).toBe('hide_resource');
    });

    it('note 为空白时存储为 null', () => {
      const created = createResource(USER_ID, makeValidInput());
      const result = reviewResource(
        (created as { resource: { id: string } }).resource.id,
        ADMIN_ID,
        { status: 'published', note: '   ' },
      );
      expect(result.ok).toBe(true);
      const row = inMemoryDb.prepare('SELECT review_note FROM resources WHERE id = ?').get(
        (created as { resource: { id: string } }).resource.id,
      ) as { review_note: string | null };
      expect(row.review_note).toBeNull();
    });
  });

  describe('updateResource — 编辑回退 draft', () => {
    it('已发布资源编辑后状态回退为 draft', () => {
      const created = createResource(USER_ID, makeValidInput());
      const id = (created as { resource: { id: string } }).resource.id;
      reviewResource(id, ADMIN_ID, { status: 'published' });
      const result = updateResource(id, USER_ID, { title: '修改后的标题' });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.resource.status).toBe('draft');
      expect(result.resource.title).toBe('修改后的标题');
    });

    it('已隐藏资源编辑后状态回退为 draft', () => {
      const created = createResource(USER_ID, makeValidInput());
      const id = (created as { resource: { id: string } }).resource.id;
      reviewResource(id, ADMIN_ID, { status: 'hidden' });
      const result = updateResource(id, USER_ID, { title: '修改' });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.resource.status).toBe('draft');
    });

    it('编辑后再审核可重新发布', () => {
      const created = createResource(USER_ID, makeValidInput());
      const id = (created as { resource: { id: string } }).resource.id;
      reviewResource(id, ADMIN_ID, { status: 'published' });
      updateResource(id, USER_ID, { title: '修订版' });
      const result = reviewResource(id, ADMIN_ID, { status: 'published' });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.resource.status).toBe('published');
    });
  });
});

describe('resource 模块 — IDOR 防护', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
    seedUser(USER_ID, 'u1@test.com', '用户一');
    seedUser(USER_ID_2, 'u2@test.com', '用户二');
    seedUser(ADMIN_ID, 'admin@test.com', '管理员');
    vi.mocked(logAdminAction).mockClear();
  });

  describe('updateResource 所有权校验', () => {
    it('非作者编辑被拒绝', () => {
      const created = createResource(USER_ID, makeValidInput());
      const result = updateResource(
        (created as { resource: { id: string } }).resource.id,
        USER_ID_2,
        { title: '恶意修改' },
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe('只能编辑自己提交的资源');
    });

    it('不存在的资源返回错误', () => {
      const result = updateResource('non-existent', USER_ID, { title: 'x' });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe('资源不存在');
    });

    it('无字段更新时返回错误', () => {
      const created = createResource(USER_ID, makeValidInput());
      const result = updateResource(
        (created as { resource: { id: string } }).resource.id,
        USER_ID,
        {},
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe('没有需要更新的字段');
    });
  });

  describe('deleteResource 所有权校验', () => {
    it('非作者删除被拒绝', () => {
      const created = createResource(USER_ID, makeValidInput());
      const result = deleteResource(
        (created as { resource: { id: string } }).resource.id,
        USER_ID_2,
      );
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe('只能删除自己提交的资源');
    });

    it('作者删除成功', () => {
      const created = createResource(USER_ID, makeValidInput());
      const id = (created as { resource: { id: string } }).resource.id;
      const result = deleteResource(id, USER_ID);
      expect(result.ok).toBe(true);
      expect(getResourceById(id)).toBeNull();
    });

    it('不存在的资源返回错误', () => {
      const result = deleteResource('non-existent', USER_ID);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error).toBe('资源不存在');
    });
  });
});

describe('resource 模块 — 列表查询', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
    seedUser(USER_ID, 'u1@test.com', '用户一');
    seedUser(USER_ID_2, 'u2@test.com', '用户二');
    seedUser(ADMIN_ID, 'admin@test.com', '管理员');
    vi.mocked(logAdminAction).mockClear();
  });

  function seedPublishedResource(overrides: Record<string, unknown> = {}) {
    const created = createResource(USER_ID, makeValidInput(overrides));
    const id = (created as { resource: { id: string } }).resource.id;
    reviewResource(id, ADMIN_ID, { status: 'published' });
    return id;
  }

  describe('listResources', () => {
    it('默认只返回 published 资源', () => {
      createResource(USER_ID, makeValidInput({ title: '草稿' }));
      seedPublishedResource({ title: '已发布' });
      const result = listResources({ page: 1, pageSize: 20 });
      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].title).toBe('已发布');
    });

    it('按 resourceType 筛选', () => {
      seedPublishedResource({ title: '文章', resourceType: 'article' });
      seedPublishedResource({ title: '视频', resourceType: 'video' });
      const result = listResources({ page: 1, pageSize: 20, resourceType: 'video' });
      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].title).toBe('视频');
    });

    it('按 techTag 筛选（json_each）', () => {
      seedPublishedResource({ title: 'React 文章', techTags: ['react'] });
      seedPublishedResource({ title: 'Vue 文章', techTags: ['vue'] });
      const result = listResources({ page: 1, pageSize: 20, techTag: 'react' });
      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].title).toBe('React 文章');
    });

    it('popular 排序按 like_count 优先', () => {
      const id1 = seedPublishedResource({ title: '低赞' });
      const id2 = seedPublishedResource({ title: '高赞' });
      inMemoryDb.prepare('UPDATE resources SET like_count = 10 WHERE id = ?').run(id2);
      inMemoryDb.prepare('UPDATE resources SET like_count = 1 WHERE id = ?').run(id1);
      const result = listResources({ page: 1, pageSize: 20, sort: 'popular' });
      expect(result.resources[0].title).toBe('高赞');
    });

    it('分页计算 totalPages', () => {
      for (let i = 0; i < 3; i++) {
        seedPublishedResource({ title: `R${i}` });
      }
      const result = listResources({ page: 1, pageSize: 2 });
      expect(result.resources).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.totalPages).toBe(2);
    });

    it('techTagCounts 聚合标签计数', () => {
      seedPublishedResource({ title: 'R1', techTags: ['react', 'frontend'] });
      seedPublishedResource({ title: 'R2', techTags: ['react'] });
      const result = listResources({ page: 1, pageSize: 20 });
      expect(result.techTagCounts['react']).toBe(2);
      expect(result.techTagCounts['frontend']).toBe(1);
    });
  });

  describe('listPendingResources', () => {
    it('返回所有 draft 资源按创建时间升序', () => {
      const r1 = createResource(USER_ID, makeValidInput({ title: '先提交' }));
      const r2 = createResource(USER_ID, makeValidInput({ title: '后提交' }));
      const result = listPendingResources(1, 20);
      expect(result.resources).toHaveLength(2);
      expect(result.resources[0].title).toBe('先提交');
      expect(result.resources[1].title).toBe('后提交');
    });

    it('已发布资源不在待审列表', () => {
      const id = createResource(USER_ID, makeValidInput());
      reviewResource((id as { resource: { id: string } }).resource.id, ADMIN_ID, { status: 'published' });
      createResource(USER_ID, makeValidInput({ title: '待审' }));
      const result = listPendingResources(1, 20);
      expect(result.resources).toHaveLength(1);
      expect(result.resources[0].title).toBe('待审');
    });

    it('分页生效', () => {
      for (let i = 0; i < 3; i++) {
        createResource(USER_ID, makeValidInput({ title: `R${i}` }));
      }
      const result = listPendingResources(1, 2);
      expect(result.resources).toHaveLength(2);
      expect(result.total).toBe(3);
      expect(result.totalPages).toBe(2);
    });
  });
});

describe('resource 模块 — 浏览计数', () => {
  beforeEach(() => {
    initTestSchema();
    clearTables();
    seedUser(USER_ID, 'u1@test.com', '用户一');
  });

  it('incrementResourceView 增加 view_count', () => {
    const created = createResource(USER_ID, makeValidInput());
    const id = (created as { resource: { id: string } }).resource.id;
    incrementResourceView(id);
    incrementResourceView(id);
    const row = inMemoryDb.prepare('SELECT view_count FROM resources WHERE id = ?').get(id) as {
      view_count: number;
    };
    expect(row.view_count).toBe(2);
  });
});

describe('resource 模块 — 文件安全', () => {
  const FILE_USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  beforeEach(() => {
    fsMocks.existsSync.mockReturnValue(true);
    fsMocks.readFileSync.mockReturnValue(Buffer.from('content'));
    fsMocks.mkdirSync.mockClear();
    fsMocks.writeFileSync.mockClear();
  });

  describe('saveResourceFile', () => {
    it('生成 URL 格式正确并写入文件', () => {
      const url = saveResourceFile(FILE_USER_ID, Buffer.from('data'), '.pdf');
      expect(url).toMatch(/^\/api\/tools\/resource\/upload\?filename=/);
      const filename = url.split('filename=')[1];
      expect(filename).toMatch(new RegExp(`^${FILE_USER_ID}-\\d+-[a-f0-9]{8}\\.pdf$`));
      expect(fsMocks.mkdirSync).not.toHaveBeenCalled();
      expect(fsMocks.writeFileSync).toHaveBeenCalledTimes(1);
    });

    it('目录不存在时自动创建', () => {
      fsMocks.existsSync.mockReturnValueOnce(false);
      saveResourceFile(FILE_USER_ID, Buffer.from('data'), '.png');
      expect(fsMocks.mkdirSync).toHaveBeenCalledWith(
        expect.any(String),
        { recursive: true },
      );
    });
  });

  describe('readResourceFile — 路径遍历防护', () => {
    it('合法文件名返回文件内容', () => {
      const validName = `${FILE_USER_ID}-1700000000-aabbccdd.pdf`;
      const result = readResourceFile(validName);
      expect(result).not.toBeNull();
      expect(result!.mimeType).toBe('application/pdf');
    });

    it('包含 .. 的文件名被拒绝', () => {
      const result = readResourceFile(`${FILE_USER_ID}-1700000000-aabbccdd../../../etc/passwd.pdf`);
      expect(result).toBeNull();
    });

    it('包含 / 的文件名被拒绝', () => {
      const result = readResourceFile(`/etc/passwd/${FILE_USER_ID}-1700000000-aabbccdd.pdf`);
      expect(result).toBeNull();
    });

    it('包含 \\ 的文件名被拒绝', () => {
      const result = readResourceFile(`..\\..\\${FILE_USER_ID}-1700000000-aabbccdd.pdf`);
      expect(result).toBeNull();
    });

    it('格式不合法的文件名被拒绝', () => {
      expect(readResourceFile('malicious.exe')).toBeNull();
      expect(readResourceFile('no-extension')).toBeNull();
      expect(readResourceFile('')).toBeNull();
    });

    it('文件不存在时返回 null', () => {
      fsMocks.existsSync.mockReturnValueOnce(false);
      const result = readResourceFile(`${FILE_USER_ID}-1700000000-aabbccdd.pdf`);
      expect(result).toBeNull();
    });

    it('读取异常时返回 null', () => {
      fsMocks.readFileSync.mockImplementationOnce(() => {
        throw new Error('EACCES');
      });
      const result = readResourceFile(`${FILE_USER_ID}-1700000000-aabbccdd.png`);
      expect(result).toBeNull();
    });

    it('各扩展名 MIME 正确', () => {
      const cases: Array<[string, string]> = [
        ['jpg', 'image/jpeg'],
        ['jpeg', 'image/jpeg'],
        ['png', 'image/png'],
        ['webp', 'image/webp'],
        ['gif', 'image/gif'],
        ['pdf', 'application/pdf'],
        ['zip', 'application/zip'],
      ];
      for (const [ext, mime] of cases) {
        const result = readResourceFile(`${FILE_USER_ID}-1700000000-aabbccdd.${ext}`);
        expect(result!.mimeType).toBe(mime);
      }
    });
  });
});

describe('resource 模块 — RESOURCE_TYPE_LABELS', () => {
  it('包含全部 6 种资源类型中文标签', () => {
    expect(RESOURCE_TYPE_LABELS.article).toBe('文章');
    expect(RESOURCE_TYPE_LABELS.video).toBe('视频');
    expect(RESOURCE_TYPE_LABELS.course).toBe('课程');
    expect(RESOURCE_TYPE_LABELS.tool).toBe('工具');
    expect(RESOURCE_TYPE_LABELS.book).toBe('书籍');
    expect(RESOURCE_TYPE_LABELS.other).toBe('其他');
  });
});
