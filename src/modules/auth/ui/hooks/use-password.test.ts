// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePassword } from './use-password';

/**
 * usePassword 单测（GENERAL 3.8「tests 覆盖拆分后组件」、2.4「拆分即补测」）
 * mock next-intl 与 fetch，聚焦客户端校验与成功/失败分支。
 */

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('usePassword', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('初始状态为空表单', () => {
    const { result } = renderHook(() => usePassword());
    expect(result.current.passwordForm).toEqual({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    expect(result.current.savingPassword).toBe(false);
    expect(result.current.passwordMessage).toBeNull();
  });

  it('当前密码为空时校验失败（不发起请求）', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => usePassword());

    await act(async () => {
      await result.current.handlePasswordSubmit(
        new Event('submit') as unknown as React.FormEvent,
      );
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.passwordMessage?.type).toBe('error');
  });

  it('两次密码不一致时校验失败', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => usePassword());

    act(() => {
      result.current.setPasswordForm({
        currentPassword: 'oldpass',
        newPassword: 'newpass123',
        confirmPassword: 'different',
      });
    });

    await act(async () => {
      await result.current.handlePasswordSubmit(
        new Event('submit') as unknown as React.FormEvent,
      );
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.passwordMessage?.type).toBe('error');
  });

  it('提交成功：清空表单并提示成功', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => usePassword());

    act(() => {
      result.current.setPasswordForm({
        currentPassword: 'oldpass',
        newPassword: 'newpass123',
        confirmPassword: 'newpass123',
      });
    });

    await act(async () => {
      await result.current.handlePasswordSubmit(
        new Event('submit') as unknown as React.FormEvent,
      );
    });

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/profile/password',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(result.current.passwordForm).toEqual({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
    expect(result.current.passwordMessage?.type).toBe('success');
  });

  it('401 响应：当前密码错误提示', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: 'wrong' }),
    });
    vi.stubGlobal('fetch', fetchMock);
    const { result } = renderHook(() => usePassword());

    act(() => {
      result.current.setPasswordForm({
        currentPassword: 'oldpass',
        newPassword: 'newpass123',
        confirmPassword: 'newpass123',
      });
    });

    await act(async () => {
      await result.current.handlePasswordSubmit(
        new Event('submit') as unknown as React.FormEvent,
      );
    });

    expect(result.current.passwordMessage?.type).toBe('error');
  });
});
