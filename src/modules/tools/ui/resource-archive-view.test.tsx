// @vitest-environment jsdom

/**
 * @file ResourceArchiveView 冒烟测试（C2-2 双入口 · 真实数据映射）
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';
import { ResourceArchiveView } from './resource-archive-view';

vi.mock('@/shared/hooks/use-api-request', () => ({ apiRequest: vi.fn() }));
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) =>
    ({
      archiveCrumb: 'RESOURCE ARCHIVE // 资源档案',
      archiveBack: '资源站',
      archiveLoading: '// 载入中...',
      archiveError: '// 资源载入失败',
      archivePlaceholder: '标题 / 标签 / 作者…',
      submit: '提交资源',
      empty: '暂无资源',
      resTypeArticle: '文章',
      resTypeVideo: '视频',
    })[key] ?? key,
}));
vi.mock('./hooks/use-resources', () => ({
  resourceTypeLabel: (_t: unknown, k: string) =>
    ({ article: '文章', video: '视频', course: '课程', tool: '工具', book: '书籍', other: '其他' })[k] ?? k,
}));

const { apiRequest } = await import('@/shared/hooks/use-api-request');
const mockedRequest = vi.mocked(apiRequest);

/** 资源夹具（仅覆盖视图所需字段） */
const RESOURCES = [
  {
    id: 'r-1',
    title: '线段树从入门到进阶',
    url: 'https://example.com/seg',
    description: '线段树讲解',
    resource_type: 'article',
    tech_tags: '算法,数据结构',
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-02T00:00:00Z',
    view_count: 12,
    like_count: 3,
    author_display_name: '教研组',
  },
  {
    id: 'r-2',
    title: '动态规划入门',
    url: 'https://example.com/dp',
    description: null,
    resource_type: 'article',
    tech_tags: null,
    created_at: '2026-08-20T00:00:00Z',
    updated_at: '2026-08-21T00:00:00Z',
    view_count: 5,
    like_count: 1,
    author_display_name: null,
  },
  {
    id: 'r-3',
    title: 'CSS 布局录播',
    url: 'https://example.com/css',
    description: '视频',
    resource_type: 'video',
    tech_tags: 'CSS',
    created_at: '2026-07-11T00:00:00Z',
    updated_at: '2026-07-12T00:00:00Z',
    view_count: 30,
    like_count: 8,
    author_display_name: '前端组',
  },
];

function stubMatchMedia(reduced = false) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: reduced,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe('ResourceArchiveView', () => {
  beforeEach(() => {
    stubMatchMedia(false);
    localStorage.clear();
    mockedRequest.mockReset();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('按 resource_type 分组渲染，编号映射为 A-001 / V-001', async () => {
    mockedRequest.mockResolvedValue({
      ok: true,
      data: { resources: RESOURCES, total: 3, page: 1, totalPages: 1, techTagCounts: {} },
    } as never);
    const { container } = render(<ResourceArchiveView />);
    expect(screen.getByText('// 载入中...')).toBeInTheDocument();
    await waitFor(() => expect(container.querySelectorAll('.rhine-arow').length).toBe(2));
    // 首行：编号 A-001 + 标题（侧栏/详情覆盖层同名，故限定行内查询）
    const first = container.querySelectorAll('.rhine-arow')[0];
    expect(first.textContent).toContain('A-001');
    expect(within(first as HTMLElement).getByText('线段树从入门到进阶')).toBeInTheDocument();
    // 切换到视频类
    fireEvent.keyDown(document, { key: 'ArrowRight' });
    expect(container.querySelectorAll('.rhine-arow')[0].textContent).toContain('V-001');
  });

  it('详情覆盖层携带资源外链', async () => {
    mockedRequest.mockResolvedValue({
      ok: true,
      data: { resources: RESOURCES, total: 3, page: 1, totalPages: 1, techTagCounts: {} },
    } as never);
    const { container } = render(<ResourceArchiveView />);
    await waitFor(() => expect(container.querySelectorAll('.rhine-arow').length).toBe(2));
    fireEvent.keyDown(document, { key: 'Enter' });
    const dialog = screen.getByRole('dialog', { name: '档案详情 A-001' });
    const link = dialog.querySelector('a[href="https://example.com/seg"]');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toContain('noopener');
  });

  it('请求失败时显示错误态与返回入口', async () => {
    mockedRequest.mockResolvedValue({ ok: false, error: 'boom' } as never);
    render(<ResourceArchiveView />);
    await waitFor(() => expect(screen.getByText('// 资源载入失败')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /资源站/ })).toBeInTheDocument();
  });
});
