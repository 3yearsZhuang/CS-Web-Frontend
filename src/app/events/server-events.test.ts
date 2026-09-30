import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prefetchEvents } from './server-events';
import * as backendClient from '@/shared/backend-client';
import * as nextHeaders from 'next/headers';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@/shared/backend-client', async () => {
  const actual = await vi.importActual<typeof backendClient>('@/shared/backend-client');
  return {
    ...actual,
    proxyBackend: vi.fn(),
  };
});

describe('prefetchEvents', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('成功获取活动数据并转换', async () => {
    const mockCookieStore = {
      get: vi.fn().mockImplementation((name: string) => {
        if (name === backendClient.ACCESS_COOKIE) return { value: 'test-access-token' };
        if (name === backendClient.REFRESH_COOKIE) return { value: 'test-refresh-token' };
        return undefined;
      }),
    };
    vi.mocked(nextHeaders.cookies).mockResolvedValue(mockCookieStore as never);

    vi.mocked(backendClient.proxyBackend).mockResolvedValue({
      status: 200,
      body: {
        items: [
          {
            id: 1,
            title: '测试活动',
            slug: 'test-event',
            date: '2026-10-01',
            status: 'upcoming',
          },
        ],
      },
      clearAuth: false,
    });

    const events = await prefetchEvents();
    expect(events.length).toBe(1);
    expect(events[0].id).toBe('1');
    expect(events[0].title).toBe('测试活动');
  });

  it('代理返回非 200 或异常时降级返回空数组', async () => {
    vi.mocked(nextHeaders.cookies).mockResolvedValue({
      get: vi.fn().mockReturnValue(undefined),
    } as never);

    vi.mocked(backendClient.proxyBackend).mockResolvedValue({
      status: 500,
      body: { error: 'Internal Error' },
      clearAuth: false,
    });

    const events = await prefetchEvents();
    expect(events).toEqual([]);
  });

  it('抛出异常时捕获并返回空数组', async () => {
    vi.mocked(nextHeaders.cookies).mockRejectedValue(new Error('Network error'));
    const events = await prefetchEvents();
    expect(events).toEqual([]);
  });
});
