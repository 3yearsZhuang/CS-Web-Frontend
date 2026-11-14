// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));
import { useTeams } from './use-teams';

/** useTeams 单测：队伍列表、邀请确认与建队。 */

function res(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

function installFetch(overrides: Record<string, () => Response> = {}) {
  const fetchMock = vi.fn().mockImplementation(async (url: string) => {
    if (overrides[url]) return overrides[url]();
    if (url.startsWith('/api/teams/invitations/me')) {
      return res({
        items: [
          {
            id: 7,
            teamId: 3,
            inviteeUserId: 42,
            inviterUserId: 9,
            status: 'pending',
            expiresAt: null,
          },
        ],
      });
    }
    if (url.startsWith('/api/teams?')) {
      return res({
        items: [
          {
            id: 3,
            name: '夜航队',
            captainUserId: 9,
            status: 'forming',
            version: 1,
            members: [
              { userId: 9, displayName: '队长', role: 'captain', status: 'active' },
            ],
          },
        ],
      });
    }
    if (url === '/api/teams') return res({ id: 4 }, 201);
    if (url.endsWith('/accept') || url.endsWith('/reject')) return res({ status: 'ok' });
    if (url.endsWith('/invitations')) return res({ id: 8 }, 201);
    if (url.endsWith('/leave')) return res({ status: 'left' });
    return res({});
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('useTeams', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('加载队伍与待处理邀请', async () => {
    installFetch();
    const { result } = renderHook(() => useTeams());

    await act(async () => {
      await result.current.loadTeams();
    });

    expect(result.current.teams).toHaveLength(1);
    expect(result.current.teams[0].name).toBe('夜航队');
    expect(result.current.teams[0].members[0].role).toBe('captain');
    expect(result.current.invitations).toHaveLength(1);
    expect(result.current.loading).toBe(false);
  });

  it('接受邀请后刷新列表', async () => {
    const fetchMock = installFetch();
    const { result } = renderHook(() => useTeams());

    await act(async () => {
      await result.current.loadTeams();
    });
    await act(async () => {
      await result.current.respondInvitation('7', true);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/teams/invitations/7/accept',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.current.actingId).toBeNull();
  });

  it('建队携带邀请人列表', async () => {
    const fetchMock = installFetch();
    const { result } = renderHook(() => useTeams());

    await act(async () => {
      await result.current.createTeam('夜航队', [42, 43]);
    });

    const call = fetchMock.mock.calls.find(([url]) => url === '/api/teams');
    expect(call).toBeTruthy();
    expect(JSON.parse(call![1].body as string)).toEqual({
      name: '夜航队',
      inviteeUserIds: [42, 43],
    });
  });

  it('建队失败时写入错误信息', async () => {
    installFetch({ '/api/teams': () => res({ error: '人数已达上限' }, 409) });
    const { result } = renderHook(() => useTeams());

    await act(async () => {
      await result.current.createTeam('队伍', []);
    });

    await waitFor(() => expect(result.current.error).toBe('人数已达上限'));
    expect(result.current.teams).toHaveLength(0);
  });
});
